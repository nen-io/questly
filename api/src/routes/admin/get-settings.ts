import type { Router } from 'express';

import { loadAdminSnapshot } from './shared';

export const registerGetSettingsRoute = (router: Router) => {
    router.get('/settings', async (req, res) => {
        const snapshot = await loadAdminSnapshot(req.auth!.realmId);
        res.json(snapshot.settings);
    });
};
