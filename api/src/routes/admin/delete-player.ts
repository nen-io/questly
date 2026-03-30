import type { Router } from 'express';

import { emailVerificationTokens } from '../../db/schema';
import { getRealmSetupState, saveRealmOnboardingState } from '../../lib/onboarding';
import {
    and,
    createPlatformEvent,
    db,
    endUserSessionsForUser,
    eq,
    handleRouteError,
    idParamSchema,
    parseWithSchema,
    playerPointBalances,
    publishInvalidate,
    rewardAssignments,
    taskAssignments,
    users,
} from './shared';

export const registerDeletePlayerRoute = (router: Router) => {
    router.delete('/players/:id', async (req, res) => {
        try {
            const { id: userId } = parseWithSchema(idParamSchema('player id'), req.params);
            const [existing] = await db.select({
                id: users.id,
                displayName: users.displayName,
                role: users.role,
                status: users.status,
            }).from(users).where(and(
                eq(users.id, userId),
                eq(users.realmId, req.auth!.realmId),
            )).limit(1);

            if (!existing || existing.role !== 'player' || existing.status !== 'active') {
                return res.status(404).json({ error: 'Player not found' });
            }

            const now = new Date();

            await db.transaction(async (tx) => {
                await tx.delete(taskAssignments).where(eq(taskAssignments.userId, userId));
                await tx.delete(rewardAssignments).where(eq(rewardAssignments.userId, userId));
                await tx.delete(playerPointBalances).where(eq(playerPointBalances.userId, userId));
                await tx.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));

                // Preserve historical wins, comments, and purchases by retiring the account
                // instead of hard-deleting the user row that those records still reference.
                await tx.update(users)
                    .set({
                        status: 'deleted',
                        updatedAt: now,
                    })
                    .where(eq(users.id, userId));
            });

            await endUserSessionsForUser(userId);

            const setup = await getRealmSetupState(req.auth!.realmId);
            // Onboarding can move backwards if the roster becomes empty again.
            if (!setup.isLaunched && !setup.requirements.hasPlayer && setup.completedSteps.includes('player')) {
                await saveRealmOnboardingState({
                    realmId: req.auth!.realmId,
                    completedSteps: setup.completedSteps.filter((step) => step !== 'player'),
                    replaceCompletedSteps: true,
                });
            }

            await createPlatformEvent({
                realmId: req.auth!.realmId,
                type: 'player_deleted',
                actorUserId: req.auth!.id,
                subjectUserId: userId,
                summary: `${req.auth!.displayName} deleted the player ${existing.displayName}.`,
            });
            publishInvalidate({
                realmId: req.auth!.realmId,
                reason: 'admin.player_deleted',
                queryKeys: [['session'], ['admin-bootstrap'], ['admin-onboarding-bootstrap'], ['public-config'], ['tasks'], ['rewards'], ['admin-tasks'], ['admin-rewards'], ['activity-feed']],
            });

            res.status(204).end();
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'admin.players.delete.failed',
                fallbackMessage: 'Unable to delete player',
                context: { playerId: req.params.id ?? null },
            });
        }
    });
};
