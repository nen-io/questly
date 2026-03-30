import type { Router } from 'express';

import { asc, asyncHandler, db, themePresets } from './shared';

export const registerGetThemesRoute = (router: Router) => {
    router.get('/themes', asyncHandler(async (_req, res) => {
        res.json(await db.select().from(themePresets).orderBy(asc(themePresets.name)));
    }));
};
