import type { Router } from 'express';

import {
    and,
    createPlatformEvent,
    db,
    eq,
    idParamSchema,
    parseWithSchema,
    publishInvalidate,
    rewardPurchases,
    rewards,
} from './shared';

export const registerRedeemRewardRoute = (router: Router) => {
    router.post('/purchases/:id/redeem', async (req, res, next) => {
        if (req.auth!.role !== 'player') {
            return res.status(403).json({ error: 'Admins cannot redeem rewards' });
        }

        try {
            const { id: purchaseId } = parseWithSchema(idParamSchema('purchase id'), req.params);

            const [updated] = await db.update(rewardPurchases)
                .set({
                    status: 'redeemed',
                    redeemedAt: new Date(),
                })
                .where(and(
                    eq(rewardPurchases.id, purchaseId),
                    eq(rewardPurchases.userId, req.auth!.id),
                ))
                .returning({
                    id: rewardPurchases.id,
                    status: rewardPurchases.status,
                    redeemedAt: rewardPurchases.redeemedAt,
                });

            if (!updated) {
                return res.status(404).json({ error: 'Purchase not found' });
            }

            const [purchaseDetails] = await db.select({
                rewardId: rewardPurchases.rewardId,
                rewardTitle: rewards.title,
            })
                .from(rewardPurchases)
                .innerJoin(rewards, eq(rewards.id, rewardPurchases.rewardId))
                .where(eq(rewardPurchases.id, purchaseId))
                .limit(1);

            if (purchaseDetails) {
                await createPlatformEvent({
                    realmId: req.auth!.realmId,
                    type: 'reward_redeemed',
                    actorUserId: req.auth!.id,
                    subjectUserId: req.auth!.id,
                    rewardId: purchaseDetails.rewardId,
                    rewardPurchaseId: purchaseId,
                    summary: `${req.auth!.displayName} redeemed ${purchaseDetails.rewardTitle}.`,
                });
            }

            publishInvalidate({
                realmId: req.auth!.realmId,
                reason: 'rewards.redeemed',
                queryKeys: [['rewards'], ['reward-purchases'], ['activity-feed']],
                userIds: [req.auth!.id],
            });
            res.json(updated);
        } catch (error) {
            next(error);
        }
    });
};
