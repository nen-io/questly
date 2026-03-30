import type { Router } from 'express';

import { listRealmPlayersWithPresence } from './shared';

export const registerGetPlayersRoute = (router: Router) => {
    router.get('/players', async (req, res) => {
        res.json(await listRealmPlayersWithPresence(req.auth!.realmId));
    });
};
