import { and, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { playerPointBalances, pointCategories, taskAssignments, taskPointRules, taskRuns, tasks, users } from '../db/schema';
import { createPlatformEvent } from './activity-events';
import { HttpError } from './http';
import { logError, serializeError } from './logger';
import { publishInvalidate } from './realtime';

type TaskRuleDetail = {
    categoryId: number;
    slug: string;
    name: string;
    color: string;
    icon: string | null;
    amount: number;
};

type RuleMap = Record<number, TaskRuleDetail>;

interface OverdueTaskRunCandidate {
    runId: number;
    taskId: number;
    userId: number;
    realmId: number;
    taskTitle: string;
    playerDisplayName: string;
}

interface ExpiredTaskRunEffect extends OverdueTaskRunCandidate {
    pointSnapshot: Array<{
        categoryId: number;
        slug: string;
        name: string;
        color: string;
        icon: string | null;
        amount: number;
    }>;
}

const recurrenceCooldownMs: Record<string, number> = {
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
    one_time: 365 * 24 * 60 * 60 * 1000,
};

export const expireOverdueTaskRuns = async (userId: number) => {
    await sweepOverdueTaskRuns({ userId });
};

const buildPenaltyPointSnapshot = (penaltyRules: TaskRuleDetail[]) => penaltyRules.map((rule) => ({
    categoryId: rule.categoryId,
    slug: rule.slug,
    name: rule.name,
    color: rule.color,
    icon: rule.icon,
    amount: -Math.abs(rule.amount),
}));

const listPenaltyRulesByTask = async (taskIds: number[]) => {
    if (taskIds.length === 0) {
        return new Map<number, TaskRuleDetail[]>();
    }

    const rows = await db.select({
        taskId: taskPointRules.taskId,
        categoryId: taskPointRules.categoryId,
        slug: pointCategories.slug,
        name: pointCategories.name,
        color: pointCategories.color,
        icon: pointCategories.icon,
        amount: taskPointRules.amount,
    })
        .from(taskPointRules)
        .innerJoin(pointCategories, eq(pointCategories.id, taskPointRules.categoryId))
        .where(and(
            inArray(taskPointRules.taskId, taskIds),
            eq(taskPointRules.kind, 'penalty'),
        ));

    const penaltyRulesByTask = new Map<number, TaskRuleDetail[]>();

    for (const row of rows) {
        const current = penaltyRulesByTask.get(row.taskId) ?? [];
        current.push({
            categoryId: row.categoryId,
            slug: row.slug,
            name: row.name,
            color: row.color,
            icon: row.icon,
            amount: row.amount,
        });
        penaltyRulesByTask.set(row.taskId, current);
    }

    return penaltyRulesByTask;
};

const listOverdueTaskRunCandidates = async (input: {
    userId?: number;
    taskId?: number;
} = {}) => {
    const now = new Date();
    const conditions = [
        eq(taskRuns.status, 'active'),
        lt(taskRuns.dueAt, now),
    ];

    if (input.userId) {
        conditions.push(eq(taskRuns.userId, input.userId));
    }

    if (input.taskId) {
        conditions.push(eq(taskRuns.taskId, input.taskId));
    }

    return db.select({
        runId: taskRuns.id,
        taskId: taskRuns.taskId,
        userId: taskRuns.userId,
        realmId: tasks.realmId,
        taskTitle: tasks.title,
        playerDisplayName: users.displayName,
    })
        .from(taskRuns)
        .innerJoin(tasks, eq(tasks.id, taskRuns.taskId))
        .innerJoin(users, eq(users.id, taskRuns.userId))
        .where(and(...conditions));
};

const expireTaskRunCandidate = async (
    candidate: OverdueTaskRunCandidate,
    penaltyRulesByTask: Map<number, TaskRuleDetail[]>,
) => {
    const now = new Date();
    const penaltyRules = penaltyRulesByTask.get(candidate.taskId) ?? [];
    const pointSnapshot = buildPenaltyPointSnapshot(penaltyRules);

    const [expiredRun] = await db.transaction(async (tx) => {
        // Claim the run first so request-driven expiry checks and the background sweep
        // cannot both deduct the same penalties for one overdue quest.
        const claimed = await tx.update(taskRuns)
            .set({
                status: 'expired',
                resolvedAt: now,
                pointSnapshot,
            })
            .where(and(
                eq(taskRuns.id, candidate.runId),
                eq(taskRuns.status, 'active'),
                lt(taskRuns.dueAt, now),
            ))
            .returning({ id: taskRuns.id });

        if (claimed.length === 0) {
            return [null];
        }

        for (const rule of penaltyRules) {
            const [balance] = await tx.select().from(playerPointBalances).where(and(
                eq(playerPointBalances.userId, candidate.userId),
                eq(playerPointBalances.categoryId, rule.categoryId),
            )).limit(1);

            if (!balance) {
                continue;
            }

            await tx.update(playerPointBalances)
                .set({
                    balance: Math.max(0, balance.balance - Math.abs(rule.amount)),
                    updatedAt: now,
                })
                .where(eq(playerPointBalances.id, balance.id));
        }

        return claimed;
    });

    if (!expiredRun) {
        return null;
    }

    return {
        ...candidate,
        pointSnapshot,
    } satisfies ExpiredTaskRunEffect;
};

export const sweepOverdueTaskRuns = async (input: {
    userId?: number;
    taskId?: number;
} = {}) => {
    const overdueRuns = await listOverdueTaskRunCandidates(input);
    if (overdueRuns.length === 0) {
        return [];
    }

    const penaltyRulesByTask = await listPenaltyRulesByTask(Array.from(new Set(overdueRuns.map((run) => run.taskId))));
    const expiredRunEffects: ExpiredTaskRunEffect[] = [];

    for (const run of overdueRuns) {
        const expiredRun = await expireTaskRunCandidate(run, penaltyRulesByTask);
        if (!expiredRun) {
            continue;
        }

        expiredRunEffects.push(expiredRun);

        try {
            await createPlatformEvent({
                realmId: run.realmId,
                type: 'quest_expired',
                actorUserId: run.userId,
                subjectUserId: run.userId,
                taskId: run.taskId,
                taskRunId: run.runId,
                summary: expiredRun.pointSnapshot.length > 0
                    ? `${run.playerDisplayName} let ${run.taskTitle} expire and took the penalty.`
                    : `${run.playerDisplayName} let ${run.taskTitle} expire.`,
                metadata: {
                    autoExpired: true,
                    penaltyRuleCount: expiredRun.pointSnapshot.length,
                },
            });
        } catch (error) {
            logError('tasks.expire.create_event_failed', {
                realmId: run.realmId,
                userId: run.userId,
                taskId: run.taskId,
                taskRunId: run.runId,
                error: serializeError(error),
            });
        }
    }

    if (expiredRunEffects.length === 0) {
        return [];
    }

    const realmUsers = new Map<number, Set<number>>();
    for (const effect of expiredRunEffects) {
        const userIds = realmUsers.get(effect.realmId) ?? new Set<number>();
        userIds.add(effect.userId);
        realmUsers.set(effect.realmId, userIds);
    }

    for (const [realmId, userIds] of realmUsers.entries()) {
        // Realm-wide views need the new activity event and point totals, while the
        // affected player also needs their quest lists and session balances refreshed.
        publishInvalidate({
            realmId,
            reason: 'tasks.expired',
            queryKeys: [['activity-feed'], ['leaderboard']],
        });
        publishInvalidate({
            realmId,
            reason: 'tasks.expired',
            queryKeys: [['tasks'], ['task-detail'], ['session']],
            userIds: Array.from(userIds),
        });
    }

    return expiredRunEffects;
};

const listTaskRuleMaps = async (taskIds: number[]) => {
    if (taskIds.length === 0) {
        return {
            rewardRulesByTask: new Map<number, RuleMap>(),
            penaltyRulesByTask: new Map<number, RuleMap>(),
        };
    }

    const rows = await db.select({
        taskId: taskPointRules.taskId,
        kind: taskPointRules.kind,
        categoryId: taskPointRules.categoryId,
        slug: pointCategories.slug,
        name: pointCategories.name,
        color: pointCategories.color,
        icon: pointCategories.icon,
        amount: taskPointRules.amount,
    })
        .from(taskPointRules)
        .innerJoin(pointCategories, eq(pointCategories.id, taskPointRules.categoryId))
        .where(inArray(taskPointRules.taskId, taskIds));

    const rewardRulesByTask = new Map<number, RuleMap>();
    const penaltyRulesByTask = new Map<number, RuleMap>();

    for (const row of rows) {
        const targetMap = row.kind === 'reward' ? rewardRulesByTask : penaltyRulesByTask;
        const current = targetMap.get(row.taskId) || {};
        current[row.categoryId] = {
            categoryId: row.categoryId,
            slug: row.slug,
            name: row.name,
            color: row.color,
            icon: row.icon,
            amount: row.amount,
        };
        targetMap.set(row.taskId, current);
    }

    return { rewardRulesByTask, penaltyRulesByTask };
};

export const listAccessibleTasks = async (realmId: number, userId: number) => {
    await sweepOverdueTaskRuns({ userId });

    const taskRows = await db.select({
        id: tasks.id,
        title: tasks.title,
        slug: tasks.slug,
        description: tasks.description,
        color: tasks.color,
        icon: tasks.icon,
        recurrence: tasks.recurrence,
        assignmentMode: tasks.assignmentMode,
        expiresInHours: tasks.expiresInHours,
        isActive: tasks.isActive,
        assignedUserId: taskAssignments.userId,
    })
        .from(tasks)
        .leftJoin(taskAssignments, eq(taskAssignments.taskId, tasks.id))
        .where(and(
            eq(tasks.realmId, realmId),
            eq(tasks.isActive, true),
        ));

    const tasksMap = new Map<number, {
        id: number;
        title: string;
        slug: string;
        description: string | null;
        color: string | null;
        icon: string | null;
        recurrence: string;
        assignmentMode: string;
        expiresInHours: number | null;
        isActive: boolean;
        assigneeIds: number[];
    }>();

    for (const row of taskRows) {
        const current = tasksMap.get(row.id) || {
            id: row.id,
            title: row.title,
            slug: row.slug,
            description: row.description,
            color: row.color,
            icon: row.icon,
            recurrence: row.recurrence,
            assignmentMode: row.assignmentMode,
            expiresInHours: row.expiresInHours,
            isActive: row.isActive,
            assigneeIds: [],
        };

        if (row.assignedUserId && !current.assigneeIds.includes(row.assignedUserId)) {
            current.assigneeIds.push(row.assignedUserId);
        }

        tasksMap.set(row.id, current);
    }

    const accessibleTasks = Array.from(tasksMap.values()).filter((task) => (
        task.assignmentMode === 'all_players'
            || task.assigneeIds.length === 0
            || task.assigneeIds.includes(userId)
    ));
    const taskIds = accessibleTasks.map((task) => task.id);
    const [taskRunRows, { rewardRulesByTask, penaltyRulesByTask }] = await Promise.all([
        taskIds.length > 0
            ? db.select().from(taskRuns).where(and(
                eq(taskRuns.userId, userId),
                inArray(taskRuns.taskId, taskIds),
            )).orderBy(desc(taskRuns.startedAt))
            : Promise.resolve([]),
        listTaskRuleMaps(taskIds),
    ]);

    const runsByTask = new Map<number, typeof taskRunRows>();
    for (const row of taskRunRows) {
        const current = runsByTask.get(row.taskId) || [];
        current.push(row);
        runsByTask.set(row.taskId, current);
    }

    return accessibleTasks.map((task) => {
        const runs = runsByTask.get(task.id) || [];
        const activeRun = runs.find((run) => run.status === 'active');
        const latestResolvedRun = runs.find((run) => run.status === 'completed' || run.status === 'expired');
        const cooldownMs = recurrenceCooldownMs[task.recurrence] || 0;
        const cooldownEndsAt = latestResolvedRun?.resolvedAt && cooldownMs > 0
            ? new Date(latestResolvedRun.resolvedAt.getTime() + cooldownMs)
            : null;
        const inCooldown = Boolean(cooldownEndsAt && cooldownEndsAt > new Date());

        return {
            ...task,
            status: activeRun ? 'active' : inCooldown ? 'cooldown' : 'available',
            activeRunId: activeRun?.id ?? null,
            dueAt: activeRun?.dueAt ?? null,
            cooldownEndsAt,
            rewardRules: Object.values(rewardRulesByTask.get(task.id) || {}),
            penaltyRules: Object.values(penaltyRulesByTask.get(task.id) || {}),
            latestRun: runs[0] ?? null,
        };
    });
};

export const startTaskRun = async (taskId: number, userId: number) => {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    if (!task || !task.isActive) {
        throw new HttpError(404, 'Quest not found');
    }

    await sweepOverdueTaskRuns({ userId, taskId });

    const existingActive = await db.select().from(taskRuns).where(and(
        eq(taskRuns.taskId, taskId),
        eq(taskRuns.userId, userId),
        eq(taskRuns.status, 'active'),
    )).limit(1);

    if (existingActive.length > 0) {
        return existingActive[0];
    }

    const cooldownMs = recurrenceCooldownMs[task.recurrence] || 0;
    if (cooldownMs > 0) {
        const [latestResolvedRun] = await db.select({
            status: taskRuns.status,
            resolvedAt: taskRuns.resolvedAt,
        })
            .from(taskRuns)
            .where(and(
                eq(taskRuns.taskId, taskId),
                eq(taskRuns.userId, userId),
                inArray(taskRuns.status, ['completed', 'expired']),
            ))
            .orderBy(desc(taskRuns.startedAt))
            .limit(1);

        const cooldownEndsAt = latestResolvedRun?.resolvedAt
            ? new Date(latestResolvedRun.resolvedAt.getTime() + cooldownMs)
            : null;

        if (cooldownEndsAt && cooldownEndsAt > new Date()) {
            throw new HttpError(400, 'Quest is cooling down for this player');
        }
    }

    const dueAt = task.expiresInHours ? new Date(Date.now() + task.expiresInHours * 60 * 60 * 1000) : null;
    const [created] = await db.insert(taskRuns).values({
        taskId,
        userId,
        status: 'active',
        dueAt,
    }).returning();

    return created;
};

export const completeTaskRun = async (
    taskId: number,
    userId: number,
    notes: string | null,
) => {
    await sweepOverdueTaskRuns({ userId, taskId });

    const [activeRun] = await db.select().from(taskRuns).where(and(
        eq(taskRuns.taskId, taskId),
        eq(taskRuns.userId, userId),
        eq(taskRuns.status, 'active'),
    )).limit(1);

    if (!activeRun) {
        const [latestRun] = await db.select({
            status: taskRuns.status,
        })
            .from(taskRuns)
            .where(and(
                eq(taskRuns.taskId, taskId),
                eq(taskRuns.userId, userId),
            ))
            .orderBy(desc(taskRuns.startedAt))
            .limit(1);

        if (latestRun?.status === 'expired') {
            throw new HttpError(400, 'Quest expired before it could be completed');
        }

        throw new HttpError(400, 'No active quest run found');
    }

    const rewardRules = await db.select({
        categoryId: taskPointRules.categoryId,
        slug: pointCategories.slug,
        name: pointCategories.name,
        color: pointCategories.color,
        icon: pointCategories.icon,
        amount: taskPointRules.amount,
    })
        .from(taskPointRules)
        .innerJoin(pointCategories, eq(pointCategories.id, taskPointRules.categoryId))
        .where(and(
            eq(taskPointRules.taskId, taskId),
            eq(taskPointRules.kind, 'reward'),
        ));

    const now = new Date();

    await db.transaction(async (tx) => {
        for (const rule of rewardRules) {
            const [balance] = await tx.select().from(playerPointBalances).where(and(
                eq(playerPointBalances.userId, userId),
                eq(playerPointBalances.categoryId, rule.categoryId),
            )).limit(1);

            if (!balance) {
                continue;
            }

            await tx.update(playerPointBalances)
                .set({
                    balance: balance.balance + rule.amount,
                    updatedAt: now,
                })
                .where(eq(playerPointBalances.id, balance.id));
        }

        await tx.update(taskRuns)
            .set({
                status: 'completed',
                resolvedAt: now,
                notes,
                pointSnapshot: rewardRules,
            })
            .where(eq(taskRuns.id, activeRun.id));
    });

    return activeRun.id;
};

export const summarizeTaskStats = async (userId: number) => {
    const [row] = await db.select({
        completedCount: sql<number>`count(*)::int`,
    })
        .from(taskRuns)
        .where(and(eq(taskRuns.userId, userId), eq(taskRuns.status, 'completed')));

    return {
        completedCount: row?.completedCount ?? 0,
    };
};
