import type { Router } from 'express';

import { asyncHandler, loadAdminSnapshot } from './shared';

export const registerGetOnboardingBootstrapRoute = (router: Router) => {
    router.get('/onboarding/bootstrap', asyncHandler(async (req, res) => {
        res.json(await loadAdminSnapshot(req.auth!.realmId));
    }));
};
