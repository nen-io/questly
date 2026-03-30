import type { Router } from 'express';
import { getRequestLogContext, logError, serializeError } from '../../lib/logger';

import {
    and,
    completeTaskPayloadSchema,
    completeTaskRun,
    createNotifications,
    createPlatformEvent,
    db,
    eq,
    handleRouteError,
    idParamSchema,
    parseWithSchema,
    publishInvalidate,
    queueTaskRunMediaJobs,
    tasks,
    uploadFiles,
    users,
} from './shared';

export const registerCompleteTaskRoute = (router: Router) => {
    router.post('/:id/complete', uploadFiles, async (req, res) => {
        if (req.auth!.role !== 'player') {
            return res.status(403).json({ error: 'Admins cannot complete quests' });
        }

        try {
            const { id: taskId } = parseWithSchema(idParamSchema('quest id'), req.params);
            const payload = parseWithSchema(completeTaskPayloadSchema, req.body ?? {});
            const uploadedFiles = (req.files as Express.Multer.File[]) || [];
            const runId = await completeTaskRun(
                taskId,
                req.auth!.id,
                payload.notes ?? null,
            );
            let mediaProcessing: {
                status: 'none' | 'queued' | 'failed';
                queuedCount: number;
                failedCount: number;
            } = {
                status: 'none',
                queuedCount: 0,
                failedCount: 0,
            };

            if (uploadedFiles.length > 0) {
                try {
                    const queuedMedia = await queueTaskRunMediaJobs({
                        realmId: req.auth!.realmId,
                        taskRunId: runId,
                        userId: req.auth!.id,
                        files: uploadedFiles,
                    });

                    mediaProcessing = {
                        status: queuedMedia.queuedCount > 0 ? 'queued' : 'none',
                        queuedCount: queuedMedia.queuedCount,
                        failedCount: queuedMedia.failedCount,
                    };
                } catch (error) {
                    mediaProcessing = {
                        status: 'failed',
                        queuedCount: 0,
                        failedCount: uploadedFiles.length,
                    };

                    logError('tasks.complete.media_queue_failed', {
                        ...getRequestLogContext(req),
                        taskId,
                        runId,
                        uploadedFileCount: uploadedFiles.length,
                        error: serializeError(error),
                    });
                }
            }

            const [taskRows, realmUsers] = await Promise.all([
                db.select({ title: tasks.title }).from(tasks).where(eq(tasks.id, taskId)).limit(1),
                db.select({ id: users.id }).from(users).where(and(
                    eq(users.realmId, req.auth!.realmId),
                    eq(users.status, 'active'),
                )),
            ]);

            if (taskRows[0]) {
                await createPlatformEvent({
                    realmId: req.auth!.realmId,
                    type: 'quest_completed',
                    actorUserId: req.auth!.id,
                    subjectUserId: req.auth!.id,
                    taskId,
                    taskRunId: runId,
                    summary: `${req.auth!.displayName} completed ${taskRows[0].title}.`,
                });
                await createNotifications({
                    realmId: req.auth!.realmId,
                    recipientUserIds: realmUsers.map((item) => item.id),
                    actorUserId: req.auth!.id,
                    type: 'quest_completed',
                    title: 'A quest was completed',
                    body: `${req.auth!.displayName} completed ${taskRows[0].title}.`,
                    link: '/app/wins',
                    metadata: { taskId, runId },
                    emailSubject: 'Quest completed',
                    emailIntro: `${req.auth!.displayName} just completed a quest in the platform.`,
                });
            }

            publishInvalidate({
                realmId: req.auth!.realmId,
                reason: 'tasks.completed',
                queryKeys: [['tasks'], ['activity-runs'], ['activity-media'], ['activity-feed'], ['leaderboard'], ['notifications'], ['session']],
            });
            res.json({
                success: true,
                runId,
                mediaProcessing,
            });
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'tasks.complete.failed',
                fallbackMessage: 'Unable to complete quest',
                context: { taskId: req.params.id ?? null },
            });
        }
    });
};
