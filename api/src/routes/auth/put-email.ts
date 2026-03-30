import type { Router } from 'express';

import {
    authenticate,
    db,
    eq,
    getRequestLogContext,
    handleRouteError,
    logWarn,
    parseWithSchema,
    publishInvalidate,
    sendVerificationEmail,
    serializeError,
    updateEmailSettingsPayloadSchema,
    users,
} from './shared';

export function registerUpdateEmailRoute(router: Router) {
    router.put('/email', authenticate, async (req, res) => {
        const user = req.auth;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        try {
            const payload = parseWithSchema(updateEmailSettingsPayloadSchema, req.body);
            const [storedUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
            if (!storedUser) {
                return res.status(404).json({ error: 'User not found' });
            }

            const emailChanged = payload.email !== storedUser.email;
            const [updated] = await db.update(users)
                .set({
                    email: payload.email,
                    emailVerifiedAt: emailChanged ? null : storedUser.emailVerifiedAt,
                    emailNotificationsEnabled: payload.emailNotificationsEnabled,
                    inAppNotificationsEnabled: payload.inAppNotificationsEnabled,
                    updatedAt: new Date(),
                })
                .where(eq(users.id, user.id))
                .returning({
                    id: users.id,
                    realmId: users.realmId,
                    email: users.email,
                    displayName: users.displayName,
                    emailVerifiedAt: users.emailVerifiedAt,
                    emailNotificationsEnabled: users.emailNotificationsEnabled,
                    inAppNotificationsEnabled: users.inAppNotificationsEnabled,
                });

            if (!updated) {
                return res.status(404).json({ error: 'User not found' });
            }

            publishInvalidate({
                realmId: updated.realmId,
                reason: 'auth.email_settings_updated',
                queryKeys: [['session']],
                userIds: [updated.id],
            });

            if (updated.email && emailChanged) {
                try {
                    await sendVerificationEmail(updated.id, updated.realmId, updated.email, updated.displayName);
                } catch (error) {
                    logWarn('auth.update_email.verification_email_failed', {
                        ...getRequestLogContext(req),
                        userId: updated.id,
                        email: updated.email,
                        error: serializeError(error),
                    });
                }
            }

            res.json({
                email: updated.email,
                emailVerifiedAt: updated.emailVerifiedAt,
                emailNotificationsEnabled: updated.emailNotificationsEnabled,
                inAppNotificationsEnabled: updated.inAppNotificationsEnabled,
                verificationSent: Boolean(updated.email && emailChanged),
            });
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'auth.update_email.failed',
                fallbackMessage: 'Unable to update email settings',
            });
        }
    });
}
