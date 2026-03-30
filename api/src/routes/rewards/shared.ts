import { and, desc, eq, inArray } from 'drizzle-orm';

import { db } from '../../db/client';
import { playerPointBalances, pointCategories, rewardAssignments, rewardCosts, rewardPurchases, rewards } from '../../db/schema';
import { computeFuzzyScore, selectedCategoryScore } from '../../lib/catalog';
import { asyncHandler, HttpError } from '../../lib/http';
import { buildPaginatedResult, parsePagination } from '../../lib/pagination';
import { decoratePointAmountEntries, listPointCategoryPresentation } from '../../lib/points';
import { createPlatformEvent } from '../../lib/activity-events';
import { publishInvalidate } from '../../lib/realtime';
import { idParamSchema, parseWithSchema, rewardCatalogQuerySchema, slugParamSchema } from '../../lib/schemas';

export const listAccessibleRewards = async (realmId: number, userId: number) => {
    const rewardRows = await db.select({
        id: rewards.id,
        title: rewards.title,
        slug: rewards.slug,
        description: rewards.description,
        color: rewards.color,
        icon: rewards.icon,
        assignmentMode: rewards.assignmentMode,
        cooldownDays: rewards.cooldownDays,
        isRedeemable: rewards.isRedeemable,
        isActive: rewards.isActive,
        assignedUserId: rewardAssignments.userId,
    })
        .from(rewards)
        .leftJoin(rewardAssignments, eq(rewardAssignments.rewardId, rewards.id))
        .where(and(
            eq(rewards.realmId, realmId),
            eq(rewards.isActive, true),
        ));

    const rewardsMap = new Map<number, {
        id: number;
        title: string;
        slug: string;
        description: string | null;
        color: string | null;
        icon: string | null;
        assignmentMode: string;
        cooldownDays: number;
        isRedeemable: boolean;
        isActive: boolean;
        assigneeIds: number[];
    }>();

    for (const row of rewardRows) {
        const current = rewardsMap.get(row.id) || {
            id: row.id,
            title: row.title,
            slug: row.slug,
            description: row.description,
            color: row.color,
            icon: row.icon,
            assignmentMode: row.assignmentMode,
            cooldownDays: row.cooldownDays,
            isRedeemable: row.isRedeemable,
            isActive: row.isActive,
            assigneeIds: [],
        };

        if (row.assignedUserId && !current.assigneeIds.includes(row.assignedUserId)) {
            current.assigneeIds.push(row.assignedUserId);
        }

        rewardsMap.set(row.id, current);
    }

    const accessibleRewards = Array.from(rewardsMap.values()).filter((reward) => (
        reward.assignmentMode === 'all_players'
            || reward.assigneeIds.length === 0
            || reward.assigneeIds.includes(userId)
    ));
    const rewardIds = accessibleRewards.map((reward) => reward.id);
    const [costs, purchases] = await Promise.all([
        rewardIds.length > 0
            ? db.select({
                rewardId: rewardCosts.rewardId,
                categoryId: rewardCosts.categoryId,
                slug: pointCategories.slug,
                name: pointCategories.name,
                color: pointCategories.color,
                icon: pointCategories.icon,
                amount: rewardCosts.amount,
            })
                .from(rewardCosts)
                .innerJoin(pointCategories, eq(pointCategories.id, rewardCosts.categoryId))
                .where(inArray(rewardCosts.rewardId, rewardIds))
            : Promise.resolve([]),
        rewardIds.length > 0
            ? db.select().from(rewardPurchases).where(and(
                eq(rewardPurchases.userId, userId),
                inArray(rewardPurchases.rewardId, rewardIds),
            )).orderBy(desc(rewardPurchases.purchasedAt))
            : Promise.resolve([]),
    ]);

    const purchaseCategoryIds = purchases.flatMap((purchase) =>
        Array.isArray(purchase.pointSnapshot)
            ? purchase.pointSnapshot.map((entry) => Number(entry?.categoryId)).filter((value) => Number.isInteger(value) && value > 0)
            : []);
    const pointPresentationByCategoryId = await listPointCategoryPresentation(realmId, [
        ...costs.map((item) => item.categoryId),
        ...purchaseCategoryIds,
    ]);

    const purchaseByReward = new Map<number, (typeof purchases)[number]>();
    for (const purchase of purchases) {
        if (!purchaseByReward.has(purchase.rewardId)) {
            purchaseByReward.set(purchase.rewardId, {
                ...purchase,
                pointSnapshot: decoratePointAmountEntries(purchase.pointSnapshot as Array<{
                    categoryId: number;
                    slug?: string | null;
                    name: string;
                    amount: number;
                }>, pointPresentationByCategoryId),
            });
        }
    }

    return accessibleRewards.map((reward) => {
        const latestPurchase = purchaseByReward.get(reward.id) || null;
        const cooldownEndsAt = latestPurchase && reward.cooldownDays > 0
            ? new Date(latestPurchase.purchasedAt.getTime() + reward.cooldownDays * 24 * 60 * 60 * 1000)
            : null;
        const lockedByCooldown = Boolean(cooldownEndsAt && cooldownEndsAt > new Date());

        return {
            id: reward.id,
            title: reward.title,
            slug: reward.slug,
            description: reward.description,
            color: reward.color,
            icon: reward.icon,
            assignmentMode: reward.assignmentMode,
            cooldownDays: reward.cooldownDays,
            isRedeemable: reward.isRedeemable,
            costs: costs.filter((item) => item.rewardId === reward.id),
            latestPurchase,
            status: lockedByCooldown ? 'cooldown' : 'available',
            cooldownEndsAt,
        };
    });
};

export {
    and,
    asyncHandler,
    buildPaginatedResult,
    computeFuzzyScore,
    createPlatformEvent,
    db,
    desc,
    eq,
    HttpError,
    idParamSchema,
    parsePagination,
    parseWithSchema,
    playerPointBalances,
    pointCategories,
    publishInvalidate,
    rewardAssignments,
    rewardCatalogQuerySchema,
    rewardCosts,
    rewardPurchases,
    rewards,
    selectedCategoryScore,
    slugParamSchema,
};
