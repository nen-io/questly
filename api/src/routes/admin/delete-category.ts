import type { Router } from 'express';

import {
    and,
    createPlatformEvent,
    db,
    eq,
    handleRouteError,
    idParamSchema,
    parseWithSchema,
    playerPointBalances,
    pointCategories,
    publishInvalidate,
    rewardCosts,
    sql,
    taskPointRules,
} from './shared';

export const registerDeleteCategoryRoute = (router: Router) => {
    router.delete('/categories/:id', async (req, res) => {
        try {
            const { id: categoryId } = parseWithSchema(idParamSchema('category id'), req.params);
            const [existing] = await db.select({
                id: pointCategories.id,
                name: pointCategories.name,
            }).from(pointCategories).where(and(
                eq(pointCategories.id, categoryId),
                eq(pointCategories.realmId, req.auth!.realmId),
            )).limit(1);

            if (!existing) {
                return res.status(404).json({ error: 'Kudos track not found' });
            }

            const [taskUsage, rewardUsage, balanceUsage] = await Promise.all([
                db.select({ count: sql<number>`count(*)::int` }).from(taskPointRules)
                    .where(eq(taskPointRules.categoryId, categoryId))
                    .limit(1),
                db.select({ count: sql<number>`count(*)::int` }).from(rewardCosts)
                    .where(eq(rewardCosts.categoryId, categoryId))
                    .limit(1),
                db.select({ count: sql<number>`count(*)::int` }).from(playerPointBalances)
                    .where(and(
                        eq(playerPointBalances.categoryId, categoryId),
                        sql`${playerPointBalances.balance} <> 0`,
                    ))
                    .limit(1),
            ]);

            if ((taskUsage[0]?.count ?? 0) > 0) {
                return res.status(409).json({ error: 'Remove this kudos track from every quest before deleting it.' });
            }

            if ((rewardUsage[0]?.count ?? 0) > 0) {
                return res.status(409).json({ error: 'Remove this kudos track from every reward before deleting it.' });
            }

            if ((balanceUsage[0]?.count ?? 0) > 0) {
                return res.status(409).json({ error: 'Reset every player balance for this kudos track to zero before deleting it.' });
            }

            await db.transaction(async (tx) => {
                await tx.delete(playerPointBalances).where(eq(playerPointBalances.categoryId, categoryId));
                await tx.delete(pointCategories).where(eq(pointCategories.id, categoryId));
            });

            await createPlatformEvent({
                realmId: req.auth!.realmId,
                type: 'attribute_deleted',
                actorUserId: req.auth!.id,
                summary: `${req.auth!.displayName} deleted the kudos track ${existing.name}.`,
            });
            publishInvalidate({
                realmId: req.auth!.realmId,
                reason: 'admin.category_deleted',
                queryKeys: [
                    ['session'],
                    ['tasks'],
                    ['task-detail'],
                    ['rewards'],
                    ['reward-detail'],
                    ['reward-purchases'],
                    ['leaderboard'],
                    ['activity-run'],
                    ['activity-runs'],
                    ['activity-feed'],
                    ['admin-bootstrap'],
                    ['admin-onboarding-bootstrap'],
                    ['admin-tasks'],
                    ['admin-rewards'],
                ],
            });
            res.status(204).end();
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'admin.categories.delete.failed',
                fallbackMessage: 'Unable to delete kudos track',
                context: { categoryId: req.params.id ?? null },
            });
        }
    });
};
