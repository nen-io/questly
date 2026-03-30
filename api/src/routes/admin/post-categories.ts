import type { Router } from 'express';

import {
    and,
    createCategoryPayloadSchema,
    db,
    eq,
    handleRouteError,
    parseWithSchema,
    playerPointBalances,
    pointCategories,
    publishInvalidate,
    slugify,
    users,
} from './shared';

export const registerPostCategoriesRoute = (router: Router) => {
    router.post('/categories', async (req, res) => {
        try {
            const payload = parseWithSchema(createCategoryPayloadSchema, req.body);
            const slug = slugify(payload.name);
            const [existing] = await db.select({ id: pointCategories.id }).from(pointCategories).where(and(
                eq(pointCategories.realmId, req.auth!.realmId),
                eq(pointCategories.slug, slug),
            )).limit(1);

            if (existing) {
                return res.status(409).json({ error: 'Category slug already exists' });
            }

            const [created] = await db.insert(pointCategories).values({
                realmId: req.auth!.realmId,
                slug,
                name: payload.name,
                description: payload.description ?? null,
                color: payload.color || '#1f2937',
                icon: payload.icon ?? null,
                sortOrder: payload.sortOrder ?? 0,
                isActive: payload.isActive ?? true,
                updatedAt: new Date(),
            }).returning();

            const realmUsers = await db.select({ id: users.id }).from(users).where(and(
                eq(users.realmId, req.auth!.realmId),
                eq(users.role, 'player'),
                eq(users.status, 'active'),
            ));
            if (realmUsers.length > 0) {
                await db.insert(playerPointBalances).values(realmUsers.map((user) => ({
                    userId: user.id,
                    categoryId: created.id,
                    balance: 0,
                }))).onConflictDoNothing();
            }

            publishInvalidate({
                realmId: req.auth!.realmId,
                reason: 'admin.category_created',
                queryKeys: [['session'], ['tasks'], ['rewards'], ['admin-bootstrap'], ['leaderboard']],
            });
            res.status(201).json(created);
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'admin.categories.create.failed',
                fallbackMessage: 'Unable to create category',
            });
        }
    });
};
