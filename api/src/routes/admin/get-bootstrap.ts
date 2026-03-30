import type { Router } from 'express';

import { asyncHandler, loadAdminSnapshot } from './shared';

export const registerGetBootstrapRoute = (router: Router) => {
    router.get('/bootstrap', asyncHandler(async (req, res) => {
        res.json(await loadAdminSnapshot(req.auth!.realmId));
    }));
};
