import type { Router } from 'express';

import {
    createActivityCommentPayloadSchema,
    createNotifications,
    createPlatformEvent,
    db,
    handleRouteError,
    idParamSchema,
    loadRealmRun,
    parseWithSchema,
    publishInvalidate,
    taskRunComments,
} from './shared';

export const registerPostRunCommentRoute = (router: Router) => {
    router.post('/runs/:id/comments', async (req, res) => {
        try {
            const { id: runId } = parseWithSchema(idParamSchema('run id'), req.params);
            const payload = parseWithSchema(createActivityCommentPayloadSchema, req.body);
            const body = payload.body;
            const run = await loadRealmRun(req.auth!.realmId, runId);

            const [comment] = await db.insert(taskRunComments).values({
                taskRunId: runId,
                userId: req.auth!.id,
                body,
            }).returning();

            await createPlatformEvent({
                realmId: req.auth!.realmId,
                type: 'win_commented',
                actorUserId: req.auth!.id,
                subjectUserId: run.ownerId,
                taskId: run.taskId,
                taskRunId: run.id,
                commentId: comment.id,
                summary: `${req.auth!.displayName} commented on ${run.taskTitle}.`,
                metadata: { body },
            });

            if (run.ownerId !== req.auth!.id) {
                await createNotifications({
                    realmId: req.auth!.realmId,
                    recipientUserIds: [run.ownerId],
                    actorUserId: req.auth!.id,
                    type: 'win_commented',
                    title: 'Someone commented on your win',
                    body: `${req.auth!.displayName} commented on ${run.taskTitle}.`,
                    link: '/app/wins',
                    metadata: { taskRunId: run.id, taskId: run.taskId },
                    emailSubject: 'New comment on your win',
                    emailIntro: `${req.auth!.displayName} left a comment on one of your completed wins.`,
                });
            }

            publishInvalidate({
                realmId: req.auth!.realmId,
                reason: 'activity.comment_added',
                queryKeys: [['activity-comments'], ['activity-runs'], ['activity-feed'], ['notifications'], ['session']],
            });
            res.status(201).json(comment);
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'activity.runs.comments.create.failed',
                fallbackMessage: 'Unable to add comment',
                context: { runId: req.params.id ?? null },
            });
        }
    });
};
