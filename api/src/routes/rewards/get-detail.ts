import type { Router } from 'express';

import { asyncHandler, listAccessibleRewards, parseWithSchema, slugParamSchema } from './shared';

export const registerGetRewardBySlugRoute = (router: Router) => {
    router.get('/:slug', asyncHandler(async (req, res) => {
        if (req.auth!.role !== 'player') {
            return res.status(403).json({ error: 'Admins cannot view reward details' });
        }

        const { slug } = parseWithSchema(slugParamSchema, req.params);
        const rewards = await listAccessibleRewards(req.auth!.realmId, req.auth!.id);
        const reward = rewards.find((item) => item.slug === slug);

        if (!reward) {
            return res.status(404).json({ error: 'Reward not found' });
        }

        res.json(reward);
    }));
};
