import type { Router } from 'express';

import {
    and,
    createPlatformEvent,
    db,
    eq,
    handleRouteError,
    idParamSchema,
    parseWithSchema,
    publishInvalidate,
    sql,
    taskAssignments,
    taskPointRules,
    taskRuns,
    tasks,
} from './shared';

export const registerDeleteTaskRoute = (router: Router) => {
    router.delete('/tasks/:id', async (req, res) => {
        try {
            const { id: taskId } = parseWithSchema(idParamSchema('quest id'), req.params);
            const [existing] = await db.select({ id: tasks.id, title: tasks.title }).from(tasks).where(and(
                eq(tasks.id, taskId),
                eq(tasks.realmId, req.auth!.realmId),
            )).limit(1);

            if (!existing) {
                return res.status(404).json({ error: 'Quest not found' });
            }

            const [usage] = await db.select({ count: sql<number>`count(*)::int` }).from(taskRuns).where(eq(taskRuns.taskId, taskId));
            if ((usage?.count ?? 0) > 0) {
                return res.status(409).json({ error: 'This quest already has activity. Hide it instead of deleting it.' });
            }

            await db.transaction(async (tx) => {
                await tx.delete(taskAssignments).where(eq(taskAssignments.taskId, taskId));
                await tx.delete(taskPointRules).where(eq(taskPointRules.taskId, taskId));
                await tx.delete(tasks).where(eq(tasks.id, taskId));
            });

            await createPlatformEvent({
                realmId: req.auth!.realmId,
                type: 'quest_deleted',
                actorUserId: req.auth!.id,
                taskId,
                summary: `${req.auth!.displayName} deleted the quest ${existing.title}.`,
            });
            publishInvalidate({
                realmId: req.auth!.realmId,
                reason: 'admin.quest_deleted',
                queryKeys: [['tasks'], ['activity-feed'], ['session'], ['admin-bootstrap']],
            });
            res.status(204).end();
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'admin.quests.delete.failed',
                fallbackMessage: 'Unable to delete quest',
                context: { taskId: req.params.id ?? null },
            });
        }
    });
};
