import type { Router } from 'express';

import {
    clearAuthCookie,
    endUserSession,
    publishInvalidate,
    readAuthCookieName,
    verifyToken,
} from './shared';

export function registerLogoutRoute(router: Router) {
    router.post('/logout', async (req, res) => {
        const token = req.cookies?.[readAuthCookieName()];
        if (token) {
            try {
                const payload = verifyToken(token);
                await endUserSession(payload.sessionId);
                publishInvalidate({
                    realmId: payload.realmId,
                    reason: 'auth.logout',
                    queryKeys: [['session'], ['admin-bootstrap']],
                });
            } catch {
                // Ignore invalid cookies and still clear the browser session.
            }
        }

        clearAuthCookie(res);
        res.json({ success: true });
    });
}
