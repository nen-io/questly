import type { Router } from 'express';

import {
    and,
    db,
    eq,
    getRealmSetupState,
    handleRouteError,
    loginPayloadSchema,
    parseWithSchema,
    publishInvalidate,
    setAuthCookie,
    startAuthenticatedSession,
    users,
    verifyPassword,
} from './shared';

export function registerLoginRoute(router: Router) {
    router.post('/login', async (req, res) => {
        try {
            const payload = parseWithSchema(loginPayloadSchema, req.body);
            const [user] = await db.select().from(users).where(and(
                eq(users.username, payload.username),
                eq(users.status, 'active'),
            )).limit(1);

            if (!user) {
                return res.status(401).json({ error: 'Invalid username or password' });
            }

            const valid = await verifyPassword(payload.password, user.passwordHash);
            if (!valid) {
                return res.status(401).json({ error: 'Invalid username or password' });
            }

            const setupState = await getRealmSetupState(user.realmId);
            if (user.role === 'player' && !setupState.isLaunched) {
                return res.status(403).json({ error: 'The platform is still being set up. Ask the admin to launch it first.' });
            }

            const token = await startAuthenticatedSession(user, !setupState.isLaunched);
            setAuthCookie(res, token);
            publishInvalidate({
                realmId: user.realmId,
                reason: 'auth.login',
                queryKeys: [['session'], ['admin-bootstrap']],
            });

            return res.json({ success: true });
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'auth.login.failed',
                fallbackMessage: 'Login failed',
            });
        }
    });
}
