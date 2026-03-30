import { and, asc, eq, inArray } from 'drizzle-orm';
import type { ActivityRun } from '../../../shared/contracts';
import { db } from '../db/client';
import { taskRunMedia, taskRunMediaJobs, taskRuns, tasks, users } from '../db/schema';
import { getAvatarPresentation } from './avatar';
import { HttpError } from './http';
import { decoratePointAmountEntries, listPointCategoryPresentation } from './points';
import { signTaskRunMediaItem } from './s3Media';

export const activityRunSelectFields = {
    id: taskRuns.id,
    taskId: taskRuns.taskId,
    taskTitle: tasks.title,
    userId: taskRuns.userId,
    playerName: users.displayName,
    playerAvatarStorageKey: users.avatarStorageKey,
    notes: taskRuns.notes,
    resolvedAt: taskRuns.resolvedAt,
    pointSnapshot: taskRuns.pointSnapshot,
};

type ActivityRunRecord = {
    id: number;
    taskId: number;
    taskTitle: string;
    userId: number;
    playerName: string;
    playerAvatarStorageKey: string | null;
    notes: string | null;
    resolvedAt: Date | null;
    pointSnapshot: unknown;
};

export const buildActivityRunItems = async (realmId: number, rows: ActivityRunRecord[]): Promise<ActivityRun[]> => {
    if (rows.length === 0) {
        return [];
    }

    const runIds = rows.map((row) => row.id);
    const mediaRows = await db.select().from(taskRunMedia)
        .where(inArray(taskRunMedia.taskRunId, runIds))
        .orderBy(asc(taskRunMedia.sortOrder));
    const pendingJobRows = await db.select({
        taskRunId: taskRunMediaJobs.taskRunId,
    })
        .from(taskRunMediaJobs)
        .where(and(
            inArray(taskRunMediaJobs.taskRunId, runIds),
            inArray(taskRunMediaJobs.status, ['pending', 'processing', 'failed']),
        ));

    const previewByRunId = new Map<number, Array<typeof mediaRows[number]>>();
    const mediaCountByRunId = new Map<number, number>();
    const pendingMediaCountByRunId = new Map<number, number>();

    mediaRows.forEach((item) => {
        mediaCountByRunId.set(item.taskRunId, (mediaCountByRunId.get(item.taskRunId) ?? 0) + 1);

        // Keep the wins list fast by signing only the first few preview assets here.
        const current = previewByRunId.get(item.taskRunId) ?? [];
        if (current.length < 3) {
            current.push(item);
            previewByRunId.set(item.taskRunId, current);
        }
    });
    pendingJobRows.forEach((item) => {
        pendingMediaCountByRunId.set(item.taskRunId, (pendingMediaCountByRunId.get(item.taskRunId) ?? 0) + 1);
    });

    const [avatars, signedPreviewEntries] = await Promise.all([
        Promise.all(rows.map((row) => getAvatarPresentation(row.userId, row.playerAvatarStorageKey))),
        Promise.all(Array.from(previewByRunId.entries()).map(async ([runId, items]) => [
            runId,
            await Promise.all(items.map((item) => signTaskRunMediaItem(item))),
        ] as const)),
    ]);
    const signedPreviewByRunId = new Map(signedPreviewEntries);

    const pointCategoryIds = rows.flatMap((row) =>
        Array.isArray(row.pointSnapshot)
            ? row.pointSnapshot
                .map((entry) => Number((entry as { categoryId?: unknown })?.categoryId))
                .filter((value) => Number.isInteger(value) && value > 0)
            : []);
    const pointPresentationByCategoryId = await listPointCategoryPresentation(realmId, pointCategoryIds);

    return rows.map((row, index) => ({
        id: row.id,
        taskId: row.taskId,
        taskTitle: row.taskTitle,
        userId: row.userId,
        playerName: row.playerName,
        playerAvatarUrl: avatars[index].avatarUrl,
        playerAvatarAsset: avatars[index].avatarAsset,
        notes: row.notes,
        resolvedAt: row.resolvedAt?.toISOString() ?? null,
        pointSnapshot: decoratePointAmountEntries(row.pointSnapshot as Array<{
            categoryId: number;
            slug?: string | null;
            name: string;
            amount: number;
        }>, pointPresentationByCategoryId),
        previewMedia: signedPreviewByRunId.get(row.id) ?? [],
        mediaCount: mediaCountByRunId.get(row.id) ?? 0,
        pendingMediaCount: pendingMediaCountByRunId.get(row.id) ?? 0,
    }));
};

export const getActivityRunById = async (realmId: number, runId: number): Promise<ActivityRun> => {
    const [row] = await db.select(activityRunSelectFields)
        .from(taskRuns)
        .innerJoin(tasks, eq(tasks.id, taskRuns.taskId))
        .innerJoin(users, eq(users.id, taskRuns.userId))
        .where(and(
            eq(taskRuns.id, runId),
            eq(tasks.realmId, realmId),
            eq(taskRuns.status, 'completed'),
        ))
        .limit(1);

    if (!row) {
        throw new HttpError(404, 'Completed win not found');
    }

    const [item] = await buildActivityRunItems(realmId, [row]);
    return item;
};
