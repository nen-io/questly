import type { Router } from 'express';

import {
    and,
    db,
    endUserSessionsForUser,
    eq,
    handleRouteError,
    hashPassword,
    idParamSchema,
    parseWithSchema,
    publishInvalidate,
    resetPlayerPasswordPayloadSchema,
    sql,
    users,
} from './shared';

export const registerPatchPlayerPasswordRoute = (router: Router) => {
    router.patch('/players/:id/password', async (req, res) => {
        try {
            const { id: userId } = parseWithSchema(idParamSchema('player id'), req.params);
            const payload = parseWithSchema(resetPlayerPasswordPayloadSchema, req.body);

            const [updated] = await db.update(users)
                .set({
                    passwordHash: await hashPassword(payload.temporaryPassword),
                    mustChangePassword: true,
                    tokenVersion: sql`${users.tokenVersion} + 1`,
                    updatedAt: new Date(),
                })
                .where(and(eq(users.id, userId), eq(users.realmId, req.auth!.realmId)))
                .returning({
                    id: users.id,
                    username: users.username,
                    mustChangePassword: users.mustChangePassword,
                });

            if (!updated) {
                return res.status(404).json({ error: 'Player not found' });
            }

            await endUserSessionsForUser(userId);
            publishInvalidate({
                realmId: req.auth!.realmId,
                reason: 'admin.player_password_reset',
                queryKeys: [['session'], ['admin-bootstrap']],
            });
            res.json(updated);
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'admin.players.reset_password.failed',
                fallbackMessage: 'Unable to reset player password',
                context: { userId: req.params.id ?? null },
            });
        }
    });
};
