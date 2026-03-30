import { and, asc, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import {
    contentBlocks,
    playerPointBalances,
    pointCategories,
    realmSettings,
    rewardAssignments,
    rewardCosts,
    rewardPurchases,
    rewards,
    taskAssignments,
    taskPointRules,
    taskRuns,
    tasks,
    themePresets,
    users,
} from '../../db/schema';
import { getRealmPresentation } from '../../lib/content';
import { asyncHandler, handleRouteError, HttpError } from '../../lib/http';
import { createNotifications } from '../../lib/notifications';
import { buildPaginatedResult, parsePagination } from '../../lib/pagination';
import { hashPassword } from '../../lib/passwords';
import { createPlatformEvent } from '../../lib/activity-events';
import { listRealmPlayersWithPresence } from '../../lib/players';
import { ensureBalancesForUsers } from '../../lib/points';
import { publishInvalidate } from '../../lib/realtime';
import {
    createCategoryPayloadSchema,
    createPlayerPayloadSchema,
    createRewardPayloadSchema,
    createTaskPayloadSchema,
    adminCatalogQuerySchema,
    idParamSchema,
    parseWithSchema,
    resetPlayerPasswordPayloadSchema,
    updateCategoryAppearancePayloadSchema,
    updateOnboardingStatePayloadSchema,
    updatePlayerBalancesPayloadSchema,
    updateSettingsPayloadSchema,
} from '../../lib/schemas';
import { getRealmSetupState, launchRealmOnboarding, saveRealmOnboardingState } from '../../lib/onboarding';
import { endUserSessionsForUser } from '../../lib/sessionManager';
import { slugify } from '../../lib/slugs';
import { normalizeOnboardingStep, type AdminBootstrap, type AdminReward, type AdminTask, type ThemeConfig } from '../../../../shared/contracts';

export type AssignmentMode = 'all_players' | 'selected_players';
export type RuleKind = 'reward' | 'penalty';

export const withRuleKind = <T extends { categoryId: number; amount: number }>(rules: T[], kind: RuleKind) => (
    rules.map((rule) => ({
        categoryId: rule.categoryId,
        amount: rule.amount,
        kind,
    }))
);

export const replaceTaskRelations = async (
    taskId: number,
    assignmentMode: AssignmentMode,
    userIds: number[],
    rewardRules: Array<{ categoryId: number; amount: number; kind: RuleKind }>,
    penaltyRules: Array<{ categoryId: number; amount: number; kind: RuleKind }>,
) => {
    await db.delete(taskAssignments).where(eq(taskAssignments.taskId, taskId));
    if (assignmentMode === 'selected_players' && userIds.length > 0) {
        await db.insert(taskAssignments).values(userIds.map((userId) => ({ taskId, userId })));
    }

    await db.delete(taskPointRules).where(eq(taskPointRules.taskId, taskId));
    const nextRules = [...rewardRules, ...penaltyRules];
    if (nextRules.length > 0) {
        await db.insert(taskPointRules).values(nextRules.map((rule) => ({
            taskId,
            categoryId: rule.categoryId,
            kind: rule.kind,
            amount: rule.amount,
        })));
    }
};

export const replaceRewardRelations = async (
    rewardId: number,
    assignmentMode: AssignmentMode,
    userIds: number[],
    costs: Array<{ categoryId: number; amount: number; kind: RuleKind }>,
) => {
    await db.delete(rewardAssignments).where(eq(rewardAssignments.rewardId, rewardId));
    if (assignmentMode === 'selected_players' && userIds.length > 0) {
        await db.insert(rewardAssignments).values(userIds.map((userId) => ({ rewardId, userId })));
    }

    await db.delete(rewardCosts).where(eq(rewardCosts.rewardId, rewardId));
    if (costs.length > 0) {
        await db.insert(rewardCosts).values(costs.map((rule) => ({
            rewardId,
            categoryId: rule.categoryId,
            amount: rule.amount,
        })));
    }
};

export const loadActivePlayerIds = async (realmId: number) => {
    const rows = await db.select({ id: users.id }).from(users).where(and(
        eq(users.realmId, realmId),
        eq(users.role, 'player'),
        eq(users.status, 'active'),
    ));

    return rows.map((row) => row.id);
};

export const resolvePlayerRecipients = async (realmId: number, assignmentMode: AssignmentMode, userIds: number[]) => {
    const activePlayerIds = await loadActivePlayerIds(realmId);

    if (assignmentMode === 'selected_players' && userIds.length > 0) {
        const selected = new Set(userIds);
        return activePlayerIds.filter((playerId) => selected.has(playerId));
    }

    return activePlayerIds;
};

export const assertRealmUsers = async (realmId: number, userIds: number[]) => {
    if (userIds.length === 0) {
        return;
    }

    const uniqueUserIds = Array.from(new Set(userIds));
    const rows = await db.select({ id: users.id }).from(users).where(and(
        eq(users.realmId, realmId),
        eq(users.role, 'player'),
        inArray(users.id, uniqueUserIds),
    ));

    if (rows.length !== uniqueUserIds.length) {
        throw new HttpError(400, 'One or more selected players are invalid for this realm');
    }
};

export const assertRealmCategories = async (
    realmId: number,
    rules: Array<{ categoryId: number }>,
) => {
    if (rules.length === 0) {
        return;
    }

    const uniqueCategoryIds = Array.from(new Set(rules.map((rule) => rule.categoryId)));
    const rows = await db.select({ id: pointCategories.id }).from(pointCategories).where(and(
        eq(pointCategories.realmId, realmId),
        inArray(pointCategories.id, uniqueCategoryIds),
    ));

    if (rows.length !== uniqueCategoryIds.length) {
        throw new HttpError(400, 'One or more point categories are invalid for this realm');
    }
};

const loadPlayerBalancesByUserId = async (realmId: number) => {
    const rows = await db.select({
        userId: playerPointBalances.userId,
        categoryId: pointCategories.id,
        slug: pointCategories.slug,
        name: pointCategories.name,
        color: pointCategories.color,
        icon: pointCategories.icon,
        balance: playerPointBalances.balance,
    })
        .from(playerPointBalances)
        .innerJoin(pointCategories, eq(pointCategories.id, playerPointBalances.categoryId))
        .innerJoin(users, eq(users.id, playerPointBalances.userId))
        .where(and(
            eq(users.realmId, realmId),
            eq(users.role, 'player'),
            eq(users.status, 'active'),
            eq(pointCategories.isActive, true),
        ))
        .orderBy(asc(pointCategories.sortOrder), asc(pointCategories.name));

    const balancesByUserId = new Map<number, typeof rows>();
    for (const row of rows) {
        const current = balancesByUserId.get(row.userId) ?? [];
        current.push(row);
        balancesByUserId.set(row.userId, current);
    }

    return balancesByUserId;
};

const loadAdminTasks = async (realmId: number): Promise<AdminTask[]> => {
    const taskRows = await db.select().from(tasks).where(eq(tasks.realmId, realmId)).orderBy(asc(tasks.createdAt));
    const taskIds = taskRows.map((task) => task.id);

    const [assignments, rules] = await Promise.all([
        taskIds.length > 0 ? db.select().from(taskAssignments).where(inArray(taskAssignments.taskId, taskIds)) : Promise.resolve([]),
        taskIds.length > 0 ? db.select().from(taskPointRules).where(inArray(taskPointRules.taskId, taskIds)) : Promise.resolve([]),
    ]);

    return taskRows.map((task) => ({
        ...task,
        assignmentMode: task.assignmentMode as AssignmentMode,
        color: task.color,
        icon: task.icon,
        userIds: assignments.filter((item) => item.taskId === task.id).map((item) => item.userId),
        rewardRules: rules.filter((item) => item.taskId === task.id && item.kind === 'reward').map((item) => ({
            categoryId: item.categoryId,
            amount: item.amount,
            kind: 'reward' as const,
        })),
        penaltyRules: rules.filter((item) => item.taskId === task.id && item.kind === 'penalty').map((item) => ({
            categoryId: item.categoryId,
            amount: item.amount,
            kind: 'penalty' as const,
        })),
    }));
};

const loadAdminRewards = async (realmId: number): Promise<AdminReward[]> => {
    const rewardRows = await db.select().from(rewards).where(eq(rewards.realmId, realmId)).orderBy(asc(rewards.createdAt));
    const rewardIds = rewardRows.map((reward) => reward.id);

    const [assignments, costs] = await Promise.all([
        rewardIds.length > 0 ? db.select().from(rewardAssignments).where(inArray(rewardAssignments.rewardId, rewardIds)) : Promise.resolve([]),
        rewardIds.length > 0 ? db.select().from(rewardCosts).where(inArray(rewardCosts.rewardId, rewardIds)) : Promise.resolve([]),
    ]);

    return rewardRows.map((reward) => ({
        ...reward,
        assignmentMode: reward.assignmentMode as AssignmentMode,
        color: reward.color,
        icon: reward.icon,
        userIds: assignments.filter((item) => item.rewardId === reward.id).map((item) => item.userId),
        costs: costs.filter((item) => item.rewardId === reward.id).map((item) => ({
            categoryId: item.categoryId,
            amount: item.amount,
        })),
    }));
};

export const loadAdminTaskPage = async (
    realmId: number,
    filters: { search?: string },
    pagination: { page: number; pageSize: number; offset: number },
) => {
    const trimmedSearch = filters.search?.trim().toLowerCase();
    const searchFilter = trimmedSearch
        ? or(
            sql<boolean>`lower(${tasks.title}) like ${`%${trimmedSearch}%`}`,
            sql<boolean>`coalesce(lower(${tasks.description}), '') like ${`%${trimmedSearch}%`}`,
        )
        : undefined;

    const whereClause = and(
        eq(tasks.realmId, realmId),
        searchFilter,
    );

    const [countRow, taskRows] = await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(tasks).where(whereClause),
        db.select().from(tasks)
            .where(whereClause)
            .orderBy(desc(tasks.updatedAt), desc(tasks.id))
            .limit(pagination.pageSize)
            .offset(pagination.offset),
    ]);
    const taskIds = taskRows.map((task) => task.id);

    const [assignments, rules] = await Promise.all([
        taskIds.length > 0 ? db.select().from(taskAssignments).where(inArray(taskAssignments.taskId, taskIds)) : Promise.resolve([]),
        taskIds.length > 0 ? db.select().from(taskPointRules).where(inArray(taskPointRules.taskId, taskIds)) : Promise.resolve([]),
    ]);

    const items: AdminTask[] = taskRows.map((task) => ({
        ...task,
        assignmentMode: task.assignmentMode as AssignmentMode,
        color: task.color,
        icon: task.icon,
        userIds: assignments.filter((item) => item.taskId === task.id).map((item) => item.userId),
        rewardRules: rules.filter((item) => item.taskId === task.id && item.kind === 'reward').map((item) => ({
            categoryId: item.categoryId,
            amount: item.amount,
            kind: 'reward' as const,
        })),
        penaltyRules: rules.filter((item) => item.taskId === task.id && item.kind === 'penalty').map((item) => ({
            categoryId: item.categoryId,
            amount: item.amount,
            kind: 'penalty' as const,
        })),
    }));

    return buildPaginatedResult(items, countRow[0]?.count ?? 0, pagination.page, pagination.pageSize);
};

export const loadAdminRewardPage = async (
    realmId: number,
    filters: { search?: string },
    pagination: { page: number; pageSize: number; offset: number },
) => {
    const trimmedSearch = filters.search?.trim().toLowerCase();
    const searchFilter = trimmedSearch
        ? or(
            sql<boolean>`lower(${rewards.title}) like ${`%${trimmedSearch}%`}`,
            sql<boolean>`coalesce(lower(${rewards.description}), '') like ${`%${trimmedSearch}%`}`,
        )
        : undefined;

    const whereClause = and(
        eq(rewards.realmId, realmId),
        searchFilter,
    );

    const [countRow, rewardRows] = await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(rewards).where(whereClause),
        db.select().from(rewards)
            .where(whereClause)
            .orderBy(desc(rewards.updatedAt), desc(rewards.id))
            .limit(pagination.pageSize)
            .offset(pagination.offset),
    ]);
    const rewardIds = rewardRows.map((reward) => reward.id);

    const [assignments, costs] = await Promise.all([
        rewardIds.length > 0 ? db.select().from(rewardAssignments).where(inArray(rewardAssignments.rewardId, rewardIds)) : Promise.resolve([]),
        rewardIds.length > 0 ? db.select().from(rewardCosts).where(inArray(rewardCosts.rewardId, rewardIds)) : Promise.resolve([]),
    ]);

    const items: AdminReward[] = rewardRows.map((reward) => ({
        ...reward,
        assignmentMode: reward.assignmentMode as AssignmentMode,
        color: reward.color,
        icon: reward.icon,
        userIds: assignments.filter((item) => item.rewardId === reward.id).map((item) => item.userId),
        costs: costs.filter((item) => item.rewardId === reward.id).map((item) => ({
            categoryId: item.categoryId,
            amount: item.amount,
        })),
    }));

    return buildPaginatedResult(items, countRow[0]?.count ?? 0, pagination.page, pagination.pageSize);
};

export const loadAdminSnapshot = async (realmId: number): Promise<AdminBootstrap> => {
    await ensureBalancesForUsers(realmId);

    const [presentation, setupState, playerRows, categoryRows, taskCountRows, rewardCountRows, themes, balancesByUserId] = await Promise.all([
        getRealmPresentation(realmId),
        getRealmSetupState(realmId),
        listRealmPlayersWithPresence(realmId),
        db.select().from(pointCategories).where(eq(pointCategories.realmId, realmId)).orderBy(asc(pointCategories.sortOrder), asc(pointCategories.name)),
        db.select({ count: sql<number>`count(*)::int` }).from(tasks).where(eq(tasks.realmId, realmId)),
        db.select({ count: sql<number>`count(*)::int` }).from(rewards).where(eq(rewards.realmId, realmId)),
        db.select().from(themePresets).orderBy(asc(themePresets.name)),
        loadPlayerBalancesByUserId(realmId),
    ]);

    return {
        settings: {
            platformName: presentation.settings.platformName,
            onboardingCompleted: setupState.isLaunched,
            content: presentation.content,
            theme: presentation.theme,
        },
        setup: setupState,
        players: playerRows.map((player) => ({
            ...player,
            balances: player.role === 'player' ? (balancesByUserId.get(player.id) ?? []) : [],
        })),
        categories: categoryRows,
        catalogCounts: {
            tasks: taskCountRows[0]?.count ?? 0,
            rewards: rewardCountRows[0]?.count ?? 0,
        },
        themes: themes.map((theme) => ({
            ...theme,
            tokens: theme.tokens as ThemeConfig['tokens'],
        })),
        onboarding: {
            playerCount: playerRows.filter((player) => player.role === 'player' && player.status === 'active').length,
            categoryCount: categoryRows.filter((category) => category.isActive).length,
            completed: setupState.isLaunched,
            currentStep: setupState.currentStep,
            needsSetup: !setupState.isLaunched,
        },
    };
};

export {
    adminCatalogQuerySchema,
    and,
    asyncHandler,
    asc,
    buildPaginatedResult,
    contentBlocks,
    createCategoryPayloadSchema,
    createNotifications,
    createPlayerPayloadSchema,
    createPlatformEvent,
    createRewardPayloadSchema,
    createTaskPayloadSchema,
    db,
    desc,
    endUserSessionsForUser,
    eq,
    getRealmPresentation,
    getRealmSetupState,
    handleRouteError,
    hashPassword,
    HttpError,
    idParamSchema,
    inArray,
    launchRealmOnboarding,
    listRealmPlayersWithPresence,
    normalizeOnboardingStep,
    or,
    parsePagination,
    parseWithSchema,
    playerPointBalances,
    pointCategories,
    publishInvalidate,
    realmSettings,
    resetPlayerPasswordPayloadSchema,
    rewardAssignments,
    rewardCosts,
    rewardPurchases,
    rewards,
    saveRealmOnboardingState,
    slugify,
    sql,
    taskAssignments,
    taskPointRules,
    taskRuns,
    tasks,
    themePresets,
    updateOnboardingStatePayloadSchema,
    updateCategoryAppearancePayloadSchema,
    updatePlayerBalancesPayloadSchema,
    updateSettingsPayloadSchema,
    users,
    ensureBalancesForUsers,
};

export type { AdminBootstrap, AdminReward, AdminTask, ThemeConfig };
