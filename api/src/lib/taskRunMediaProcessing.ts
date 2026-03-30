import { and, asc, eq, inArray, isNull, lt, lte, or } from 'drizzle-orm';

import { db } from '../db/client';
import { taskRunMedia, taskRunMediaJobs } from '../db/schema';
import { logError, logInfo, serializeError } from './logger';
import { publishInvalidate } from './realtime';
import {
    createTaskRunMediaProcessingDraft,
    deleteS3Objects,
    downloadS3ObjectBuffer,
    uploadTaskRunMediaOriginalFile,
    type TaskRunMediaFileSource,
} from './s3Media';

const defaultProcessingIntervalMs = 15 * 1000;
const minimumProcessingIntervalMs = 5 * 1000;
const defaultProcessingBatchSize = 3;
const maximumProcessingBatchSize = 10;
const defaultLockTimeoutMs = 2 * 60 * 1000;
const maximumRetryDelayMs = 30 * 60 * 1000;
const defaultMaxProcessingAttempts = 12;

type TaskRunMediaJobRecord = typeof taskRunMediaJobs.$inferSelect;

let requestMediaProcessingSweep: ((trigger: 'manual' | 'startup' | 'interval') => void) | null = null;

const resolveProcessingIntervalMs = () => {
    const rawValue = Number(process.env.TASK_RUN_MEDIA_PROCESSING_INTERVAL_MS ?? defaultProcessingIntervalMs);

    if (!Number.isFinite(rawValue) || rawValue < minimumProcessingIntervalMs) {
        return defaultProcessingIntervalMs;
    }

    return rawValue;
};

const resolveProcessingBatchSize = () => {
    const rawValue = Number(process.env.TASK_RUN_MEDIA_PROCESSING_BATCH_SIZE ?? defaultProcessingBatchSize);

    if (!Number.isFinite(rawValue) || rawValue < 1) {
        return defaultProcessingBatchSize;
    }

    return Math.min(Math.trunc(rawValue), maximumProcessingBatchSize);
};

const resolveLockTimeoutMs = () => {
    const rawValue = Number(process.env.TASK_RUN_MEDIA_PROCESSING_LOCK_TIMEOUT_MS ?? defaultLockTimeoutMs);

    if (!Number.isFinite(rawValue) || rawValue < minimumProcessingIntervalMs) {
        return defaultLockTimeoutMs;
    }

    return rawValue;
};

const resolveMaxProcessingAttempts = () => {
    const rawValue = Number(process.env.TASK_RUN_MEDIA_PROCESSING_MAX_ATTEMPTS ?? defaultMaxProcessingAttempts);

    if (!Number.isFinite(rawValue) || rawValue < 1) {
        return defaultMaxProcessingAttempts;
    }

    return Math.trunc(rawValue);
};

const buildRetryDelayMs = (attemptCount: number) => (
    Math.min(2 ** Math.max(attemptCount - 1, 0) * 15_000, maximumRetryDelayMs)
);

const buildPendingJobStatuses = (): string[] => ['pending', 'failed'];

const getNextTaskRunMediaSortOrder = async (taskRunId: number) => {
    const [existingMediaRows, existingJobRows] = await Promise.all([
        db.select({ sortOrder: taskRunMedia.sortOrder })
            .from(taskRunMedia)
            .where(eq(taskRunMedia.taskRunId, taskRunId)),
        db.select({ sortOrder: taskRunMediaJobs.sortOrder })
            .from(taskRunMediaJobs)
            .where(eq(taskRunMediaJobs.taskRunId, taskRunId)),
    ]);

    const maxSortOrder = [...existingMediaRows, ...existingJobRows].reduce(
        (current, row) => Math.max(current, row.sortOrder),
        -1,
    );

    return maxSortOrder + 1;
};

export const queueTaskRunMediaJobs = async (input: {
    realmId: number;
    taskRunId: number;
    userId: number;
    files: Array<Express.Multer.File | TaskRunMediaFileSource>;
}) => {
    if (input.files.length === 0) {
        return { queuedCount: 0, failedCount: 0 };
    }

    const startingSortOrder = await getNextTaskRunMediaSortOrder(input.taskRunId);

    const queueResults = await Promise.allSettled(input.files.map(async (file, index) => {
        const uploadedOriginal = await uploadTaskRunMediaOriginalFile({
            realmId: input.realmId,
            userId: input.userId,
            file,
            sortOrder: startingSortOrder + index,
        });

        try {
            // Persist each queue record immediately after its original object lands
            // so the worker can start processing without waiting for the rest of
            // the batch to finish uploading.
            await db.insert(taskRunMediaJobs).values({
                realmId: input.realmId,
                taskRunId: input.taskRunId,
                userId: input.userId,
                mediaType: uploadedOriginal.draft.mediaType,
                mimeType: uploadedOriginal.draft.mimeType,
                storageKey: uploadedOriginal.draft.storageKey,
                originalName: uploadedOriginal.draft.originalName,
                sizeBytes: uploadedOriginal.draft.sizeBytes,
                sortOrder: uploadedOriginal.draft.sortOrder,
                status: 'pending',
                attemptCount: 0,
                nextAttemptAt: new Date(),
                updatedAt: new Date(),
            });
        } catch (error) {
            // If queue persistence fails, delete the durable original immediately
            // so we do not strand orphaned media in storage.
            await deleteS3Objects(uploadedOriginal.uploadedKeys);
            throw error;
        }

        kickTaskRunMediaProcessing();
    }));

    const queuedCount = queueResults.filter((result) => result.status === 'fulfilled').length;
    const failedResults = queueResults.filter((result) => result.status === 'rejected');

    if (failedResults.length > 0) {
        logError('task_run_media.queue.partial_failure', {
            taskRunId: input.taskRunId,
            userId: input.userId,
            realmId: input.realmId,
            requestedFileCount: input.files.length,
            queuedCount,
            failedCount: failedResults.length,
            errors: failedResults.map((result) => serializeError(result.reason)),
        });
    }

    if (queuedCount === 0 && failedResults.length > 0) {
        throw failedResults[0].reason;
    }

    return {
        queuedCount,
        failedCount: failedResults.length,
    };
};

const claimPendingTaskRunMediaJobs = async (limit: number) => {
    const now = new Date();
    const staleLockCutoff = new Date(now.getTime() - resolveLockTimeoutMs());
    const candidateStatuses = buildPendingJobStatuses();
    const candidates = await db.select()
        .from(taskRunMediaJobs)
        .where(and(
            inArray(taskRunMediaJobs.status, candidateStatuses),
            lte(taskRunMediaJobs.nextAttemptAt, now),
            or(
                isNull(taskRunMediaJobs.lockedAt),
                lt(taskRunMediaJobs.lockedAt, staleLockCutoff),
            ),
        ))
        .orderBy(asc(taskRunMediaJobs.nextAttemptAt), asc(taskRunMediaJobs.createdAt))
        .limit(limit);

    const claimed: TaskRunMediaJobRecord[] = [];

    for (const candidate of candidates) {
        const [job] = await db.update(taskRunMediaJobs)
            .set({
                status: 'processing',
                attemptCount: candidate.attemptCount + 1,
                lockedAt: now,
                lastError: null,
                updatedAt: now,
            })
            .where(and(
                eq(taskRunMediaJobs.id, candidate.id),
                inArray(taskRunMediaJobs.status, candidateStatuses),
                lte(taskRunMediaJobs.nextAttemptAt, now),
                or(
                    isNull(taskRunMediaJobs.lockedAt),
                    lt(taskRunMediaJobs.lockedAt, staleLockCutoff),
                ),
            ))
            .returning();

        if (job) {
            claimed.push(job);
        }
    }

    return claimed;
};

const markTaskRunMediaJobCompleted = async (job: TaskRunMediaJobRecord) => {
    await db.delete(taskRunMediaJobs)
        .where(eq(taskRunMediaJobs.id, job.id));
};

const markTaskRunMediaJobFailed = async (job: TaskRunMediaJobRecord, error: unknown) => {
    const now = new Date();
    const maxAttempts = resolveMaxProcessingAttempts();

    if (job.attemptCount >= maxAttempts) {
        await deleteS3Objects([job.storageKey]);
        await db.update(taskRunMediaJobs)
            .set({
                status: 'abandoned',
                lockedAt: null,
                lastError: JSON.stringify(serializeError(error)),
                nextAttemptAt: now,
                updatedAt: now,
            })
            .where(eq(taskRunMediaJobs.id, job.id));

        logError('task_run_media.processing_abandoned', {
            jobId: job.id,
            taskRunId: job.taskRunId,
            userId: job.userId,
            realmId: job.realmId,
            attemptCount: job.attemptCount,
            maxAttempts,
            error: serializeError(error),
        });
        return;
    }

    const retryDelayMs = buildRetryDelayMs(job.attemptCount);

    await db.update(taskRunMediaJobs)
        .set({
            status: 'failed',
            lockedAt: null,
            lastError: JSON.stringify(serializeError(error)),
            nextAttemptAt: new Date(now.getTime() + retryDelayMs),
            updatedAt: now,
        })
        .where(eq(taskRunMediaJobs.id, job.id));

    logError('task_run_media.processing_failed', {
        jobId: job.id,
        taskRunId: job.taskRunId,
        userId: job.userId,
        realmId: job.realmId,
        attemptCount: job.attemptCount,
        retryDelayMs,
        error: serializeError(error),
    });
};

const processTaskRunMediaJob = async (job: TaskRunMediaJobRecord) => {
    const [existingMedia] = await db.select({ id: taskRunMedia.id })
        .from(taskRunMedia)
        .where(eq(taskRunMedia.storageKey, job.storageKey))
        .limit(1);

    if (existingMedia) {
        await markTaskRunMediaJobCompleted(job);
        return;
    }

    let uploadedThumbnailKey: string | null = null;

    try {
        const originalBuffer = await downloadS3ObjectBuffer(job.storageKey);
        const draft = await createTaskRunMediaProcessingDraft({
            realmId: job.realmId,
            userId: job.userId,
            storageKey: job.storageKey,
            sortOrder: job.sortOrder,
            file: {
                buffer: originalBuffer,
                mimeType: job.mimeType,
                originalName: job.originalName,
                sizeBytes: job.sizeBytes ?? originalBuffer.byteLength,
            },
        });

        uploadedThumbnailKey = draft.thumbnailStorageKey;
        const now = new Date();

        await db.transaction(async (tx) => {
            const [alreadyInserted] = await tx.select({ id: taskRunMedia.id })
                .from(taskRunMedia)
                .where(eq(taskRunMedia.storageKey, job.storageKey))
                .limit(1);

            if (!alreadyInserted) {
                await tx.insert(taskRunMedia).values({
                    taskRunId: job.taskRunId,
                    userId: job.userId,
                    mediaType: draft.mediaType,
                    mimeType: draft.mimeType,
                    storageKey: draft.storageKey,
                    thumbnailStorageKey: draft.thumbnailStorageKey,
                    thumbnailMimeType: draft.thumbnailMimeType,
                    originalName: draft.originalName,
                    sizeBytes: draft.sizeBytes,
                    sortOrder: draft.sortOrder,
                    createdAt: now,
                });
            }

            await tx.delete(taskRunMediaJobs)
                .where(eq(taskRunMediaJobs.id, job.id));
        });

        publishInvalidate({
            realmId: job.realmId,
            reason: 'task-run-media.processed',
            queryKeys: [['activity-runs'], ['activity-run'], ['activity-media']],
        });

        logInfo('task_run_media.processed', {
            jobId: job.id,
            taskRunId: job.taskRunId,
            userId: job.userId,
            realmId: job.realmId,
        });
    } catch (error) {
        if (uploadedThumbnailKey) {
            await deleteS3Objects([uploadedThumbnailKey]);
        }

        await markTaskRunMediaJobFailed(job, error);
    }
};

export const processQueuedTaskRunMediaJobs = async (limit = resolveProcessingBatchSize()) => {
    let processedCount = 0;

    while (processedCount < limit) {
        const jobs = await claimPendingTaskRunMediaJobs(limit - processedCount);
        if (jobs.length === 0) {
            break;
        }

        for (const job of jobs) {
            await processTaskRunMediaJob(job);
            processedCount += 1;
        }
    }

    return processedCount;
};

export const kickTaskRunMediaProcessing = () => {
    requestMediaProcessingSweep?.('manual');
};

export const startTaskRunMediaProcessingSweep = () => {
    const intervalMs = resolveProcessingIntervalMs();
    const batchSize = resolveProcessingBatchSize();
    let isSweepInFlight = false;
    let rerunRequested = false;

    const runSweep = async (trigger: 'manual' | 'startup' | 'interval') => {
        if (isSweepInFlight) {
            rerunRequested = true;
            return;
        }

        isSweepInFlight = true;

        try {
            const processedCount = await processQueuedTaskRunMediaJobs(batchSize);
            if (processedCount > 0) {
                logInfo('task_run_media.sweep.completed', {
                    trigger,
                    intervalMs,
                    batchSize,
                    processedCount,
                });
            }
        } catch (error) {
            logError('task_run_media.sweep.failed', {
                trigger,
                intervalMs,
                batchSize,
                error: serializeError(error),
            });
        } finally {
            isSweepInFlight = false;

            if (rerunRequested) {
                rerunRequested = false;
                void runSweep('manual');
            }
        }
    };

    requestMediaProcessingSweep = (trigger) => {
        void runSweep(trigger);
    };

    const timer = setInterval(() => {
        void runSweep('interval');
    }, intervalMs);

    timer.unref?.();

    logInfo('task_run_media.sweep.started', {
        intervalMs,
        batchSize,
    });

    void runSweep('startup');

    return () => {
        clearInterval(timer);
        if (requestMediaProcessingSweep) {
            requestMediaProcessingSweep = null;
        }

        logInfo('task_run_media.sweep.stopped', {
            intervalMs,
            batchSize,
        });
    };
};
