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
    rewardAssignments,
    rewardCosts,
    rewardPurchases,
    rewards,
    sql,
} from './shared';

export const registerDeleteRewardRoute = (router: Router) => {
    router.delete('/rewards/:id', async (req, res) => {
        try {
            const { id: rewardId } = parseWithSchema(idParamSchema('reward id'), req.params);
            const [existing] = await db.select({ id: rewards.id, title: rewards.title }).from(rewards).where(and(
                eq(rewards.id, rewardId),
                eq(rewards.realmId, req.auth!.realmId),
            )).limit(1);

            if (!existing) {
                return res.status(404).json({ error: 'Reward not found' });
            }

            const [usage] = await db.select({ count: sql<number>`count(*)::int` }).from(rewardPurchases).where(eq(rewardPurchases.rewardId, rewardId));
            if ((usage?.count ?? 0) > 0) {
                return res.status(409).json({ error: 'This reward already has purchase history. Hide it instead of deleting it.' });
            }

            await db.transaction(async (tx) => {
                await tx.delete(rewardAssignments).where(eq(rewardAssignments.rewardId, rewardId));
                await tx.delete(rewardCosts).where(eq(rewardCosts.rewardId, rewardId));
                await tx.delete(rewards).where(eq(rewards.id, rewardId));
            });

            await createPlatformEvent({
                realmId: req.auth!.realmId,
                type: 'reward_deleted',
                actorUserId: req.auth!.id,
                rewardId,
                summary: `${req.auth!.displayName} deleted the reward ${existing.title}.`,
            });
            publishInvalidate({
                realmId: req.auth!.realmId,
                reason: 'admin.reward_deleted',
                queryKeys: [['rewards'], ['activity-feed'], ['session'], ['admin-bootstrap']],
            });
            res.status(204).end();
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'admin.rewards.delete.failed',
                fallbackMessage: 'Unable to delete reward',
                context: { rewardId: req.params.id ?? null },
            });
        }
    });
};
