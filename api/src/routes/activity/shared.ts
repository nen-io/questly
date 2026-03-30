import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';

import { db } from '../../db/client';
import { platformEvents, taskRunComments, taskRunMedia, taskRuns, tasks, users } from '../../db/schema';
import { signAvatarStorageKey } from '../../lib/avatar';
import { handleRouteError, HttpError } from '../../lib/http';
import { listLeaderboard } from '../../lib/leaderboard';
import { activityRunSelectFields, buildActivityRunItems, getActivityRunById } from '../../lib/activityRuns';
import { createNotifications } from '../../lib/notifications';
import { buildPaginatedResult, parsePagination } from '../../lib/pagination';
import { decoratePointAmountEntries, listPointCategoryPresentation } from '../../lib/points';
import { createPlatformEvent, listPlatformEventFeed } from '../../lib/activity-events';
import { publishInvalidate } from '../../lib/realtime';
import {
    activityRunsQuerySchema,
    createActivityCommentPayloadSchema,
    idParamSchema,
    paginationQuerySchema,
    parseWithSchema,
} from '../../lib/schemas';
import { signTaskRunMediaItem } from '../../lib/s3Media';

export const loadRealmRun = async (realmId: number, runId: number) => {
    const [run] = await db.select({
        id: taskRuns.id,
        taskId: taskRuns.taskId,
        ownerId: taskRuns.userId,
        taskTitle: tasks.title,
    })
        .from(taskRuns)
        .innerJoin(tasks, eq(tasks.id, taskRuns.taskId))
        .where(and(
            eq(taskRuns.id, runId),
            eq(tasks.realmId, realmId),
        ))
        .limit(1);

    if (!run) {
        throw new HttpError(404, 'Completed win not found');
    }

    return run;
};

export {
    activityRunsQuerySchema,
    activityRunSelectFields,
    and,
    asc,
    buildActivityRunItems,
    buildPaginatedResult,
    createActivityCommentPayloadSchema,
    createNotifications,
    createPlatformEvent,
    db,
    desc,
    decoratePointAmountEntries,
    eq,
    getActivityRunById,
    handleRouteError,
    HttpError,
    idParamSchema,
    inArray,
    listLeaderboard,
    listPlatformEventFeed,
    listPointCategoryPresentation,
    paginationQuerySchema,
    parsePagination,
    parseWithSchema,
    platformEvents,
    publishInvalidate,
    signAvatarStorageKey,
    signTaskRunMediaItem,
    sql,
    taskRunComments,
    taskRunMedia,
    taskRuns,
    tasks,
    users,
};
