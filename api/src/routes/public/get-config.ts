import type { Router } from 'express';

import { db } from '../../db/client';
import { realms } from '../../db/schema';
import { getRealmPresentation } from '../../lib/content';
import { asyncHandler } from '../../lib/http';
import { getRealmSetupState } from '../../lib/onboarding';

export const registerGetConfigRoute = (router: Router) => {
    router.get('/config', asyncHandler(async (_req, res) => {
        const [realm] = await db.select().from(realms).limit(1);
        if (!realm) {
            return res.status(503).json({ error: 'Platform is not seeded yet' });
        }

        const [presentation, setupState] = await Promise.all([
            getRealmPresentation(realm.id),
            getRealmSetupState(realm.id),
        ]);

        res.json({
            realm: {
                id: realm.id,
                name: realm.name,
                slug: realm.slug,
            },
            platformName: presentation.settings.platformName,
            onboardingCompleted: setupState.isLaunched,
            setup: setupState,
            content: presentation.content,
            theme: presentation.theme,
        });
    }));
};
