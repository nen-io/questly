import type { Router } from 'express';

import { and, db, eq, handleRouteError, parseWithSchema, publishInvalidate, queueTaskRunMediaJobs, taskRuns, tasks, uploadFiles } from './shared';
import { idParamSchema } from '../../lib/schemas';

export const registerQueueRunMediaRoute = (router: Router) => {
    router.post('/runs/:id/media', uploadFiles, async (req, res) => {
        if (req.auth!.role !== 'player') {
            return res.status(403).json({ error: 'Admins cannot upload win media' });
        }

        try {
            const { id: runId } = parseWithSchema(idParamSchema('run id'), req.params);
            const uploadedFiles = (req.files as Express.Multer.File[]) || [];
            const [run] = await db.select({
                id: taskRuns.id,
            })
                .from(taskRuns)
                .innerJoin(tasks, eq(tasks.id, taskRuns.taskId))
                .where(and(
                    eq(taskRuns.id, runId),
                    eq(taskRuns.userId, req.auth!.id),
                    eq(taskRuns.status, 'completed'),
                    eq(tasks.realmId, req.auth!.realmId),
                ))
                .limit(1);

            if (!run) {
                return res.status(404).json({ error: 'Completed win not found' });
            }

            const queuedMedia = await queueTaskRunMediaJobs({
                realmId: req.auth!.realmId,
                taskRunId: runId,
                userId: req.auth!.id,
                files: uploadedFiles,
            });

            publishInvalidate({
                realmId: req.auth!.realmId,
                reason: 'task-run-media.queued',
                queryKeys: [['activity-runs'], ['activity-run'], ['activity-media']],
            });

            res.json({
                success: true,
                queuedCount: queuedMedia.queuedCount,
                failedCount: queuedMedia.failedCount,
            });
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'tasks.run_media.queue_failed',
                fallbackMessage: 'Unable to queue win media',
                context: {
                    runId: req.params.id ?? null,
                    uploadedFileCount: Array.isArray(req.files) ? req.files.length : 0,
                },
            });
        }
    });
};
