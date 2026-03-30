import type { Router } from 'express';

import {
    createPlatformEvent,
    handleRouteError,
    idParamSchema,
    listAccessibleTasks,
    parseWithSchema,
    publishInvalidate,
    startTaskRun,
} from './shared';

export const registerStartTaskRoute = (router: Router) => {
    router.post('/:id/start', async (req, res) => {
        if (req.auth!.role !== 'player') {
            return res.status(403).json({ error: 'Admins cannot start quests' });
        }

        try {
            const { id: taskId } = parseWithSchema(idParamSchema('quest id'), req.params);
            const tasks = await listAccessibleTasks(req.auth!.realmId, req.auth!.id);
            const task = tasks.find((item) => item.id === taskId);

            if (!task) {
                return res.status(404).json({ error: 'Quest not found' });
            }

            if (task.status === 'cooldown') {
                return res.status(400).json({ error: 'Quest is cooling down for this player' });
            }

            const run = await startTaskRun(taskId, req.auth!.id);
            await createPlatformEvent({
                realmId: req.auth!.realmId,
                type: 'quest_started',
                actorUserId: req.auth!.id,
                subjectUserId: req.auth!.id,
                taskId,
                taskRunId: run.id,
                summary: `${req.auth!.displayName} started ${task.title}.`,
            });
            publishInvalidate({
                realmId: req.auth!.realmId,
                reason: 'tasks.started',
                queryKeys: [['tasks'], ['activity-feed'], ['session']],
                userIds: [req.auth!.id],
            });
            res.json(run);
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'tasks.start.failed',
                fallbackMessage: 'Unable to start quest',
                context: { taskId: req.params.id ?? null },
            });
        }
    });
};
