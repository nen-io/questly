import type { Router } from 'express';

import { db } from '../../db/client';
import { themePresets } from '../../db/schema';
import { asyncHandler } from '../../lib/http';

export const registerGetThemesRoute = (router: Router) => {
    router.get('/themes', asyncHandler(async (_req, res) => {
        const presets = await db.select().from(themePresets).orderBy(themePresets.name);
        res.json(presets);
    }));
};
