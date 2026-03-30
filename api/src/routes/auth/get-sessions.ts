import type { Router } from 'express';

import { asyncHandler, authenticate, listSessionsForUser } from './shared';

export function registerGetSessionsRoute(router: Router) {
    router.get('/sessions', authenticate, asyncHandler(async (req, res) => {
        if (!req.auth) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        res.json({
            currentSessionId: req.auth.sessionId,
            sessions: await listSessionsForUser(req.auth.id),
        });
    }));
}
