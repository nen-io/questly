import type { Router } from 'express';

import { asyncHandler, listAccessibleTasks, parseWithSchema, slugParamSchema } from './shared';

export const registerGetTaskBySlugRoute = (router: Router) => {
    router.get('/:slug', asyncHandler(async (req, res) => {
        if (req.auth!.role !== 'player') {
            return res.status(403).json({ error: 'Admins cannot view quest details' });
        }

        const { slug } = parseWithSchema(slugParamSchema, req.params);
        const tasks = await listAccessibleTasks(req.auth!.realmId, req.auth!.id);
        const task = tasks.find((item) => item.slug === slug);

        if (!task) {
            return res.status(404).json({ error: 'Quest not found' });
        }

        res.json(task);
    }));
};
