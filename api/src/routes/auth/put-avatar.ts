import type { Router } from 'express';

import {
    authenticate,
    db,
    deleteAvatarStorageKey,
    eq,
    handleRouteError,
    parseWithSchema,
    publishInvalidate,
    signAvatarStorageKey,
    updateAvatarPayloadSchema,
    uploadAvatarFromDataUrl,
    users,
} from './shared';

export function registerUpdateAvatarRoute(router: Router) {
    router.put('/avatar', authenticate, async (req, res) => {
        const user = req.auth;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        try {
            const payload = parseWithSchema(updateAvatarPayloadSchema, req.body);
            const [storedUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
            if (!storedUser) {
                return res.status(404).json({ error: 'User not found' });
            }

            let avatarStorageKey = storedUser.avatarStorageKey;
            if (payload.avatarDataUrl) {
                avatarStorageKey = await uploadAvatarFromDataUrl({
                    realmId: storedUser.realmId,
                    userId: storedUser.id,
                    dataUrl: payload.avatarDataUrl,
                    previousStorageKey: storedUser.avatarStorageKey,
                });
            } else if (storedUser.avatarStorageKey) {
                await deleteAvatarStorageKey(storedUser.avatarStorageKey);
                avatarStorageKey = null;
            }

            const [updated] = await db.update(users)
                .set({
                    avatarStorageKey,
                    updatedAt: new Date(),
                })
                .where(eq(users.id, user.id))
                .returning({
                    realmId: users.realmId,
                    avatarStorageKey: users.avatarStorageKey,
                });

            if (!updated) {
                return res.status(404).json({ error: 'User not found' });
            }

            publishInvalidate({
                realmId: updated.realmId,
                reason: 'auth.avatar_updated',
                queryKeys: [['session'], ['leaderboard'], ['activity-feed'], ['activity-runs']],
            });

            res.json({
                avatarUrl: await signAvatarStorageKey(updated.avatarStorageKey),
            });
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'auth.update_avatar.failed',
                fallbackMessage: 'Unable to update avatar',
            });
        }
    });
}
