import type { Router } from 'express';

import {
    authenticate,
    changePasswordPayloadSchema,
    clearAuthCookie,
    db,
    endUserSessionsForUser,
    eq,
    getRequestLogContext,
    handleRouteError,
    hashPassword,
    logWarn,
    parseWithSchema,
    publishInvalidate,
    sendVerificationEmail,
    serializeError,
    uploadAvatarFromDataUrl,
    users,
    verifyPassword,
} from './shared';

export function registerChangePasswordRoute(router: Router) {
    router.post('/change-password', authenticate, async (req, res) => {
        const user = req.auth;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        try {
            const payload = parseWithSchema(changePasswordPayloadSchema, req.body);
            const [storedUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
            if (!storedUser) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (!storedUser.mustChangePassword) {
                if (!payload.currentPassword) {
                    return res.status(400).json({ error: 'Current password is required' });
                }

                const valid = await verifyPassword(payload.currentPassword, storedUser.passwordHash);
                if (!valid) {
                    return res.status(400).json({ error: 'Current password is incorrect' });
                }
            }

            if (await verifyPassword(payload.newPassword, storedUser.passwordHash)) {
                return res.status(400).json({ error: 'Choose a different password' });
            }

            const nextEmail = payload.email ?? storedUser.email;
            const emailChanged = nextEmail !== storedUser.email;
            const avatarStorageKey = payload.avatarDataUrl
                ? await uploadAvatarFromDataUrl({
                    realmId: storedUser.realmId,
                    userId: storedUser.id,
                    dataUrl: payload.avatarDataUrl,
                    previousStorageKey: storedUser.avatarStorageKey,
                })
                : storedUser.avatarStorageKey;

            await db.update(users)
                .set({
                    passwordHash: await hashPassword(payload.newPassword),
                    mustChangePassword: false,
                    avatarStorageKey,
                    email: nextEmail,
                    emailVerifiedAt: emailChanged ? null : storedUser.emailVerifiedAt,
                    tokenVersion: storedUser.tokenVersion + 1,
                    updatedAt: new Date(),
                })
                .where(eq(users.id, user.id));
            await endUserSessionsForUser(user.id);

            if (nextEmail && emailChanged) {
                try {
                    await sendVerificationEmail(storedUser.id, storedUser.realmId, nextEmail, storedUser.displayName);
                } catch (error) {
                    logWarn('auth.change_password.verification_email_failed', {
                        ...getRequestLogContext(req),
                        userId: storedUser.id,
                        email: nextEmail,
                        error: serializeError(error),
                    });
                }
            }

            publishInvalidate({
                realmId: storedUser.realmId,
                reason: 'auth.password_changed',
                queryKeys: [['session'], ['admin-bootstrap']],
            });
            clearAuthCookie(res);
            res.json({ success: true });
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'auth.change_password.failed',
                fallbackMessage: 'Unable to change password',
            });
        }
    });
}
