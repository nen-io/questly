import type { Router } from 'express';

import {
    asyncHandler,
    authenticate,
    db,
    eq,
    handleRouteError,
    sendVerificationEmail,
    users,
} from './shared';

export function registerRequestEmailVerificationRoute(router: Router) {
    router.post('/email/request-verification', authenticate, asyncHandler(async (req, res) => {
        const user = req.auth;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const [storedUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
        if (!storedUser || !storedUser.email) {
            return res.status(400).json({ error: 'No email set for this account' });
        }

        if (storedUser.emailVerifiedAt) {
            return res.json({ success: true, alreadyVerified: true });
        }

        try {
            await sendVerificationEmail(storedUser.id, storedUser.realmId, storedUser.email, storedUser.displayName);
            res.json({ success: true });
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'auth.request_verification.failed',
                fallbackMessage: 'Unable to send verification email',
            });
        }
    }));
}
