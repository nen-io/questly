import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { platformEvents, rewards, taskRunComments, taskRuns, tasks, users } from '../db/schema';
import { getAvatarPresentation } from './avatar';
import { HttpError } from './http';

export interface CreatePlatformEventInput {
    realmId: number;
    type: string;
    summary: string;
    actorUserId?: number | null;
    subjectUserId?: number | null;
    taskId?: number | null;
    taskRunId?: number | null;
    rewardId?: number | null;
    rewardPurchaseId?: number | null;
    commentId?: number | null;
    metadata?: Record<string, unknown> | null;
}

export const createPlatformEvent = async (input: CreatePlatformEventInput) => {
    if (!Number.isInteger(input.realmId) || input.realmId < 1) {
        throw new HttpError(500, 'Invalid realm id for platform event', { expose: false });
    }

    if (typeof input.type !== 'string' || input.type.trim().length === 0) {
        throw new HttpError(500, 'Platform event type is required', { expose: false });
    }

    if (typeof input.summary !== 'string' || input.summary.trim().length === 0) {
        throw new HttpError(500, 'Platform event summary is required', { expose: false });
    }

    if (input.metadata !== undefined && input.metadata !== null && (typeof input.metadata !== 'object' || Array.isArray(input.metadata))) {
        throw new HttpError(500, 'Platform event metadata must be an object', { expose: false });
    }

    const [event] = await db.insert(platformEvents).values({
        realmId: input.realmId,
        type: input.type.trim(),
        actorUserId: input.actorUserId ?? null,
        subjectUserId: input.subjectUserId ?? null,
        taskId: input.taskId ?? null,
        taskRunId: input.taskRunId ?? null,
        rewardId: input.rewardId ?? null,
        rewardPurchaseId: input.rewardPurchaseId ?? null,
        commentId: input.commentId ?? null,
        summary: input.summary.trim(),
        metadata: input.metadata ?? null,
    }).returning();

    return event;
};

export interface PlatformEventFeedItem {
    id: number;
    type: string;
    summary: string;
    actorUserId: number | null;
    actorName: string | null;
    actorAvatarUrl: string | null;
    actorAvatarAsset: { kind: 'avatar'; userId: number } | null;
    subjectUserId: number | null;
    subjectName: string | null;
    subjectAvatarUrl: string | null;
    subjectAvatarAsset: { kind: 'avatar'; userId: number } | null;
    taskId: number | null;
    taskTitle: string | null;
    taskSlug: string | null;
    taskRunId: number | null;
    rewardId: number | null;
    rewardTitle: string | null;
    rewardSlug: string | null;
    commentId: number | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
}

export const listPlatformEventFeed = async (realmId: number, offset: number, limit: number) => {
    if (!Number.isInteger(realmId) || realmId < 1) {
        throw new HttpError(500, 'Invalid realm id for activity feed', { expose: false });
    }
    if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1) {
        throw new HttpError(500, 'Invalid activity feed pagination', { expose: false });
    }

    const rows = await db.select().from(platformEvents)
        .where(eq(platformEvents.realmId, realmId))
        .orderBy(desc(platformEvents.createdAt))
        .limit(limit)
        .offset(offset);

    if (rows.length === 0) {
        return [];
    }

    const actorIds = Array.from(new Set(rows.map((row) => row.actorUserId).filter((value): value is number => value !== null)));
    const subjectIds = Array.from(new Set(rows.map((row) => row.subjectUserId).filter((value): value is number => value !== null)));
    const taskIds = Array.from(new Set(rows.map((row) => row.taskId).filter((value): value is number => value !== null)));
    const rewardIds = Array.from(new Set(rows.map((row) => row.rewardId).filter((value): value is number => value !== null)));
    const commentIds = Array.from(new Set(rows.map((row) => row.commentId).filter((value): value is number => value !== null)));

    const [userRows, taskRows, rewardRows, commentRows] = await Promise.all([
        actorIds.length > 0 || subjectIds.length > 0
            ? db.select({
                id: users.id,
                displayName: users.displayName,
                avatarStorageKey: users.avatarStorageKey,
            }).from(users).where(inArray(users.id, Array.from(new Set([...actorIds, ...subjectIds]))))
            : Promise.resolve([]),
        taskIds.length > 0
            ? db.select({
                id: tasks.id,
                title: tasks.title,
                slug: tasks.slug,
            }).from(tasks).where(inArray(tasks.id, taskIds))
            : Promise.resolve([]),
        rewardIds.length > 0
            ? db.select({
                id: rewards.id,
                title: rewards.title,
                slug: rewards.slug,
            }).from(rewards).where(inArray(rewards.id, rewardIds))
            : Promise.resolve([]),
        commentIds.length > 0
            ? db.select({
                id: taskRunComments.id,
                body: taskRunComments.body,
            }).from(taskRunComments).where(inArray(taskRunComments.id, commentIds))
            : Promise.resolve([]),
    ]);

    const avatars = await Promise.all(userRows.map((row) => getAvatarPresentation(row.id, row.avatarStorageKey)));
    const usersById = new Map(userRows.map((row, index) => [
        row.id,
        {
            id: row.id,
            displayName: row.displayName,
            avatarUrl: avatars[index].avatarUrl,
            avatarAsset: avatars[index].avatarAsset,
        },
    ]));
    const tasksById = new Map(taskRows.map((row) => [row.id, row]));
    const rewardsById = new Map(rewardRows.map((row) => [row.id, row]));
    const commentsById = new Map(commentRows.map((row) => [row.id, row.body]));

    return rows.map<PlatformEventFeedItem>((row) => {
        const actor = row.actorUserId ? usersById.get(row.actorUserId) : null;
        const subject = row.subjectUserId ? usersById.get(row.subjectUserId) : null;

        return {
            id: row.id,
            type: row.type,
            summary: row.summary,
            actorUserId: row.actorUserId,
            actorName: actor?.displayName ?? null,
            actorAvatarUrl: actor?.avatarUrl ?? null,
            actorAvatarAsset: actor?.avatarAsset ?? null,
            subjectUserId: row.subjectUserId,
            subjectName: subject?.displayName ?? null,
            subjectAvatarUrl: subject?.avatarUrl ?? null,
            subjectAvatarAsset: subject?.avatarAsset ?? null,
            taskId: row.taskId,
            taskTitle: row.taskId ? tasksById.get(row.taskId)?.title ?? null : null,
            taskSlug: row.taskId ? tasksById.get(row.taskId)?.slug ?? null : null,
            taskRunId: row.taskRunId,
            rewardId: row.rewardId,
            rewardTitle: row.rewardId ? rewardsById.get(row.rewardId)?.title ?? null : null,
            rewardSlug: row.rewardId ? rewardsById.get(row.rewardId)?.slug ?? null : null,
            commentId: row.commentId,
            metadata: {
                ...(row.metadata as Record<string, unknown> | null ?? {}),
                commentBody: row.commentId ? commentsById.get(row.commentId) ?? null : null,
            },
            createdAt: row.createdAt.toISOString(),
        };
    });
};
