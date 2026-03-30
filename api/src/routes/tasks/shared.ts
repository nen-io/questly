import type { RequestHandler } from 'express';

import { and, eq } from 'drizzle-orm';

import { db } from '../../db/client';
import { taskRuns, tasks, users } from '../../db/schema';
import { computeFuzzyScore, selectedCategoryScore } from '../../lib/catalog';
import { asyncHandler, handleRouteError } from '../../lib/http';
import { createNotifications } from '../../lib/notifications';
import { buildPaginatedResult, parsePagination } from '../../lib/pagination';
import { createPlatformEvent } from '../../lib/activity-events';
import { publishInvalidate } from '../../lib/realtime';
import { completeTaskPayloadSchema, idParamSchema, parseWithSchema, slugParamSchema, taskCatalogQuerySchema } from '../../lib/schemas';
import { taskRunMediaUpload } from '../../lib/s3Media';
import { queueTaskRunMediaJobs } from '../../lib/taskRunMediaProcessing';
import { completeTaskRun, listAccessibleTasks, startTaskRun } from '../../lib/tasks';

export const uploadFiles = taskRunMediaUpload.array('files', 10) as unknown as RequestHandler;

export {
    and,
    asyncHandler,
    buildPaginatedResult,
    completeTaskPayloadSchema,
    completeTaskRun,
    computeFuzzyScore,
    createNotifications,
    createPlatformEvent,
    db,
    eq,
    handleRouteError,
    idParamSchema,
    listAccessibleTasks,
    parsePagination,
    parseWithSchema,
    publishInvalidate,
    queueTaskRunMediaJobs,
    selectedCategoryScore,
    slugParamSchema,
    startTaskRun,
    taskRuns,
    taskCatalogQuerySchema,
    tasks,
    users,
};
