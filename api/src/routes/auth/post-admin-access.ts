import type { Router } from 'express';

import {
    adminAccessPayloadSchema,
    and,
    db,
    eq,
    getRealmSetupState,
    handleRouteError,
    parseWithSchema,
    publishInvalidate,
    setAuthCookie,
    startAuthenticatedSession,
    users,
    verifyPassword,
} from './shared';

export function registerAdminAccessRoute(router: Router) {
    router.post('/admin-access', async (req, res) => {
        try {
            const payload = parseWithSchema(adminAccessPayloadSchema, req.body);
            const [admin] = await db.select().from(users).where(and(
                eq(users.role, 'admin'),
                eq(users.status, 'active'),
            )).limit(1);

            if (!admin) {
                return res.status(404).json({ error: 'Admin account not found' });
            }

            const setupState = await getRealmSetupState(admin.realmId);
            if (setupState.isLaunched) {
                return res.status(409).json({ error: 'Admin access is only available while setup is in progress.' });
            }

            const valid = await verifyPassword(payload.password, admin.passwordHash);
            if (!valid) {
                return res.status(401).json({ error: 'Invalid admin password' });
            }

            const token = await startAuthenticatedSession(admin, true);
            setAuthCookie(res, token);
            publishInvalidate({
                realmId: admin.realmId,
                reason: 'auth.admin_access',
                queryKeys: [['session'], ['admin-bootstrap']],
            });

            return res.json({ success: true });
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'auth.admin_access.failed',
                fallbackMessage: 'Admin access failed',
            });
        }
    });
}
