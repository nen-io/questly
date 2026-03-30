import type { Router } from 'express';

import {
    authenticate,
    changePasswordPayloadSchema,
    db,
    endUserSessionsForUser,
    eq,
    getRequestLogContext,
    handleRouteError,
    hashPassword,
    logWarn,
    parseWithSchema,
    publishInvalidate,
    setAuthCookie,
    sendVerificationEmail,
    serializeError,
    startAuthenticatedSession,
    uploadAvatarFromDataUrl,
    users,
    verifyPassword,
} from './shared';

export function registerCompletePasswordSetupRoute(router: Router) {
    router.post('/complete-password-setup', authenticate, async (req, res) => {
        const user = req.auth;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!user.mustChangePassword) {
            return res.status(400).json({ error: 'Password setup is already complete' });
        }

        try {
            const payload = parseWithSchema(changePasswordPayloadSchema, req.body);
            const [storedUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
            if (!storedUser) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (await verifyPassword(payload.newPassword, storedUser.passwordHash)) {
                return res.status(400).json({ error: 'Choose a different password' });
            }

            const nextEmail = payload.email ?? storedUser.email;
            const emailChanged = nextEmail !== storedUser.email;
            const updatedAt = new Date();
            const nextTokenVersion = storedUser.tokenVersion + 1;
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
                    tokenVersion: nextTokenVersion,
                    updatedAt,
                })
                .where(eq(users.id, user.id));

            // Rotate every existing session so the temporary-password token cannot be reused.
            await endUserSessionsForUser(user.id);
            const token = await startAuthenticatedSession({
                ...storedUser,
                avatarStorageKey,
                email: nextEmail,
                emailVerifiedAt: emailChanged ? null : storedUser.emailVerifiedAt,
                mustChangePassword: false,
                tokenVersion: nextTokenVersion,
                updatedAt,
            });

            if (nextEmail && emailChanged) {
                try {
                    await sendVerificationEmail(storedUser.id, storedUser.realmId, nextEmail, storedUser.displayName);
                } catch (error) {
                    logWarn('auth.complete_password_setup.verification_email_failed', {
                        ...getRequestLogContext(req),
                        userId: storedUser.id,
                        email: nextEmail,
                        error: serializeError(error),
                    });
                }
            }

            publishInvalidate({
                realmId: storedUser.realmId,
                reason: 'auth.password_setup_completed',
                queryKeys: [['session'], ['admin-bootstrap']],
            });
            setAuthCookie(res, token);
            res.json({ success: true });
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'auth.complete_password_setup.failed',
                fallbackMessage: 'Unable to finish password setup',
            });
        }
    });
}
