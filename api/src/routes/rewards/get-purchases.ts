import type { Router } from 'express';

import { desc, eq } from 'drizzle-orm';

import { decoratePointAmountEntries, listPointCategoryPresentation } from '../../lib/points';
import { asyncHandler, db, rewardPurchases, rewards } from './shared';

export const registerListRewardPurchasesRoute = (router: Router) => {
    router.get('/purchases', asyncHandler(async (req, res) => {
        if (req.auth!.role !== 'player') {
            return res.json([]);
        }

        const purchases = await db.select({
            id: rewardPurchases.id,
            rewardId: rewardPurchases.rewardId,
            status: rewardPurchases.status,
            purchasedAt: rewardPurchases.purchasedAt,
            redeemedAt: rewardPurchases.redeemedAt,
            pointSnapshot: rewardPurchases.pointSnapshot,
            rewardTitle: rewards.title,
        })
            .from(rewardPurchases)
            .innerJoin(rewards, eq(rewards.id, rewardPurchases.rewardId))
            .where(eq(rewardPurchases.userId, req.auth!.id))
            .orderBy(desc(rewardPurchases.purchasedAt));
        const purchaseCategoryIds = purchases.flatMap((purchase) =>
            Array.isArray(purchase.pointSnapshot)
                ? purchase.pointSnapshot.map((entry) => Number(entry?.categoryId)).filter((value) => Number.isInteger(value) && value > 0)
                : []);
        const pointPresentationByCategoryId = await listPointCategoryPresentation(req.auth!.realmId, purchaseCategoryIds);

        res.json(purchases.map((purchase) => ({
            ...purchase,
            pointSnapshot: decoratePointAmountEntries(purchase.pointSnapshot as Array<{
                categoryId: number;
                slug?: string | null;
                name: string;
                amount: number;
            }>, pointPresentationByCategoryId),
        })));
    }));
};
