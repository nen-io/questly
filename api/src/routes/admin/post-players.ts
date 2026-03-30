import type { Router } from 'express';

import {
    createPlayerPayloadSchema,
    db,
    ensureBalancesForUsers,
    eq,
    handleRouteError,
    hashPassword,
    parseWithSchema,
    publishInvalidate,
    users,
} from './shared';

export const registerPostPlayersRoute = (router: Router) => {
    router.post('/players', async (req, res) => {
        try {
            const payload = parseWithSchema(createPlayerPayloadSchema, req.body);
            const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.username, payload.username)).limit(1);
            if (existing) {
                return res.status(409).json({ error: 'Username already exists' });
            }

            const [created] = await db.insert(users).values({
                realmId: req.auth!.realmId,
                username: payload.username,
                displayName: payload.displayName,
                passwordHash: await hashPassword(payload.temporaryPassword),
                role: 'player',
                status: 'active',
                mustChangePassword: true,
            }).returning({
                id: users.id,
                username: users.username,
                displayName: users.displayName,
                role: users.role,
                status: users.status,
                mustChangePassword: users.mustChangePassword,
            });

            await ensureBalancesForUsers(req.auth!.realmId, [created.id]);
            publishInvalidate({
                realmId: req.auth!.realmId,
                reason: 'admin.player_created',
                queryKeys: [['session'], ['admin-bootstrap']],
            });

            res.status(201).json(created);
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'admin.players.create.failed',
                fallbackMessage: 'Unable to create player',
            });
        }
    });
};
