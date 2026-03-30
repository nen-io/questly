import type { Router } from 'express';

import {
    and,
    db,
    eq,
    handleRouteError,
    idParamSchema,
    parseWithSchema,
    pointCategories,
    publishInvalidate,
    updateCategoryAppearancePayloadSchema,
} from './shared';

export const registerPatchCategoryRoute = (router: Router) => {
    router.patch('/categories/:id', async (req, res) => {
        try {
            const { id: categoryId } = parseWithSchema(idParamSchema('category id'), req.params);
            const payload = parseWithSchema(updateCategoryAppearancePayloadSchema, req.body);
            const [updated] = await db.update(pointCategories)
                .set({
                    // Attribute relationships are keyed by category ID across balances,
                    // quests, rewards, and snapshots, so this route stays cosmetic-only.
                    name: payload.name,
                    color: payload.color || '#1f2937',
                    icon: payload.icon ?? null,
                    updatedAt: new Date(),
                })
                .where(and(eq(pointCategories.id, categoryId), eq(pointCategories.realmId, req.auth!.realmId)))
                .returning();

            if (!updated) {
                return res.status(404).json({ error: 'Category not found' });
            }

            publishInvalidate({
                realmId: req.auth!.realmId,
                reason: 'admin.category_updated',
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
            res.json(updated);
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'admin.categories.update.failed',
                fallbackMessage: 'Unable to update category',
                context: { categoryId: req.params.id ?? null },
            });
        }
    });
};
