import type { Router } from 'express';

import {
    and,
    assertRealmCategories,
    db,
    ensureBalancesForUsers,
    eq,
    handleRouteError,
    idParamSchema,
    loadActivePlayerIds,
    parseWithSchema,
    playerPointBalances,
    publishInvalidate,
    updatePlayerBalancesPayloadSchema,
    users,
} from './shared';

export const registerPutPlayerBalancesRoute = (router: Router) => {
    router.put('/players/:id/balances', async (req, res) => {
        try {
            const { id: userId } = parseWithSchema(idParamSchema('player id'), req.params);
            const payload = parseWithSchema(updatePlayerBalancesPayloadSchema, req.body);

            const [player] = await db.select({
                id: users.id,
                role: users.role,
                realmId: users.realmId,
                status: users.status,
            }).from(users).where(and(
                eq(users.id, userId),
                eq(users.realmId, req.auth!.realmId),
            )).limit(1);

            if (!player || player.role !== 'player' || player.status !== 'active') {
                return res.status(404).json({ error: 'Player not found' });
            }

            await assertRealmCategories(req.auth!.realmId, payload.balances);
            await ensureBalancesForUsers(req.auth!.realmId, [userId]);

            await db.transaction(async (tx) => {
                for (const entry of payload.balances) {
                    const [existing] = await tx.select({ id: playerPointBalances.id }).from(playerPointBalances).where(and(
                        eq(playerPointBalances.userId, userId),
                        eq(playerPointBalances.categoryId, entry.categoryId),
                    )).limit(1);

                    if (existing) {
                        await tx.update(playerPointBalances)
                            .set({ balance: entry.balance, updatedAt: new Date() })
                            .where(eq(playerPointBalances.id, existing.id));
                    } else {
                        await tx.insert(playerPointBalances).values({
                            userId,
                            categoryId: entry.categoryId,
                            balance: entry.balance,
                        });
                    }
                }
            });

            const activePlayerIds = await loadActivePlayerIds(req.auth!.realmId);
            publishInvalidate({
                realmId: req.auth!.realmId,
                reason: 'admin.player_balances_updated',
                queryKeys: [['session'], ['rewards'], ['tasks']],
                userIds: [userId],
            });
            publishInvalidate({
                realmId: req.auth!.realmId,
                reason: 'admin.player_balances_updated',
                queryKeys: [['leaderboard']],
                userIds: activePlayerIds,
            });
            res.json({ success: true });
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'admin.players.balances.update.failed',
                fallbackMessage: 'Unable to update player balances',
                context: { userId: req.params.id ?? null },
            });
        }
    });
};
