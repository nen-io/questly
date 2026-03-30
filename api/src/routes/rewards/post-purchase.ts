import type { Router } from 'express';

import {
    and,
    createPlatformEvent,
    db,
    desc,
    eq,
    HttpError,
    idParamSchema,
    parseWithSchema,
    playerPointBalances,
    pointCategories,
    publishInvalidate,
    rewardAssignments,
    rewardCosts,
    rewardPurchases,
    rewards,
} from './shared';

export const registerPurchaseRewardRoute = (router: Router) => {
    router.post('/:id/purchase', async (req, res, next) => {
        if (req.auth!.role !== 'player') {
            return res.status(403).json({ error: 'Admins cannot purchase rewards' });
        }

        try {
            const { id: rewardId } = parseWithSchema(idParamSchema('reward id'), req.params);

            const [reward] = await db.select().from(rewards).where(and(
                eq(rewards.id, rewardId),
                eq(rewards.realmId, req.auth!.realmId),
                eq(rewards.isActive, true),
            )).limit(1);

            if (!reward) {
                return res.status(404).json({ error: 'Reward not found' });
            }

            if (reward.assignmentMode === 'selected_players') {
                const [assignment] = await db.select().from(rewardAssignments).where(and(
                    eq(rewardAssignments.rewardId, rewardId),
                    eq(rewardAssignments.userId, req.auth!.id),
                )).limit(1);

                if (!assignment) {
                    return res.status(403).json({ error: 'Reward is not assigned to this player' });
                }
            }

            const costs = await db.select({
                categoryId: rewardCosts.categoryId,
                amount: rewardCosts.amount,
                name: pointCategories.name,
                slug: pointCategories.slug,
                color: pointCategories.color,
                icon: pointCategories.icon,
            })
                .from(rewardCosts)
                .innerJoin(pointCategories, eq(pointCategories.id, rewardCosts.categoryId))
                .where(eq(rewardCosts.rewardId, rewardId));

            const [latestPurchase] = await db.select().from(rewardPurchases).where(and(
                eq(rewardPurchases.rewardId, rewardId),
                eq(rewardPurchases.userId, req.auth!.id),
            )).orderBy(desc(rewardPurchases.purchasedAt)).limit(1);

            if (latestPurchase && reward.cooldownDays > 0) {
                const cooldownEndsAt = new Date(latestPurchase.purchasedAt.getTime() + reward.cooldownDays * 24 * 60 * 60 * 1000);
                if (cooldownEndsAt > new Date()) {
                    return res.status(400).json({ error: 'Reward is cooling down for this player' });
                }
            }

            let createdPurchaseId: number | null = null;

            await db.transaction(async (tx) => {
                for (const cost of costs) {
                    const [balance] = await tx.select().from(playerPointBalances).where(and(
                        eq(playerPointBalances.userId, req.auth!.id),
                        eq(playerPointBalances.categoryId, cost.categoryId),
                    )).limit(1);

                    if (!balance || balance.balance < cost.amount) {
                        throw new HttpError(400, `Not enough ${cost.name}`);
                    }
                }

                // Validate every balance before mutating any track so partial deductions never leak out.
                for (const cost of costs) {
                    const [balance] = await tx.select().from(playerPointBalances).where(and(
                        eq(playerPointBalances.userId, req.auth!.id),
                        eq(playerPointBalances.categoryId, cost.categoryId),
                    )).limit(1);

                    await tx.update(playerPointBalances)
                        .set({
                            balance: (balance?.balance ?? 0) - cost.amount,
                            updatedAt: new Date(),
                        })
                        .where(eq(playerPointBalances.id, balance!.id));
                }

                const [purchase] = await tx.insert(rewardPurchases).values({
                    rewardId,
                    userId: req.auth!.id,
                    status: 'purchased',
                    pointSnapshot: costs,
                }).returning({ id: rewardPurchases.id });
                createdPurchaseId = purchase.id;
            });

            await createPlatformEvent({
                realmId: req.auth!.realmId,
                type: 'reward_purchased',
                actorUserId: req.auth!.id,
                subjectUserId: req.auth!.id,
                rewardId,
                rewardPurchaseId: createdPurchaseId,
                summary: `${req.auth!.displayName} purchased ${reward.title}.`,
                metadata: { costs },
            });

            publishInvalidate({
                realmId: req.auth!.realmId,
                reason: 'rewards.purchased',
                queryKeys: [['rewards'], ['reward-purchases'], ['activity-feed'], ['leaderboard'], ['session']],
                userIds: [req.auth!.id],
            });
            res.json({ success: true });
        } catch (error) {
            next(error);
        }
    });
};
