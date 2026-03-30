import type { Router } from 'express';

import { asc, db, eq, pointCategories } from './shared';

export const registerGetCategoriesRoute = (router: Router) => {
    router.get('/categories', async (req, res) => {
        const categories = await db.select().from(pointCategories)
            .where(eq(pointCategories.realmId, req.auth!.realmId))
            .orderBy(asc(pointCategories.sortOrder), asc(pointCategories.name));

        res.json(categories);
    });
};
