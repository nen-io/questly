import type { Router } from 'express';

import {
    and,
    asyncHandler,
    authenticate,
    db,
    ensureBalancesForUsers,
    eq,
    getRealmPresentation,
    getRealmSetupState,
    isNull,
    listBalancesForUser,
    listRealmPlayersWithPresence,
    notifications,
    pointCategories,
    sql,
    summarizeTaskStats,
    taskRuns,
    users,
} from './shared';
import type { SessionData } from './shared';
import { getAvatarPresentation } from '../../lib/avatar';

export function registerGetSessionRoute(router: Router) {
    router.get('/me', authenticate, asyncHandler(async (req, res) => {
        const user = req.auth;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (user.role === 'player') {
            await ensureBalancesForUsers(user.realmId, [user.id]);
        }

        const [playerCountRow, categoryCountRow, setupState] = await Promise.all([
            db.select({ count: sql<number>`count(*)::int` }).from(users).where(and(
                eq(users.realmId, user.realmId),
                eq(users.role, 'player'),
                eq(users.status, 'active'),
            )),
            db.select({ count: sql<number>`count(*)::int` }).from(pointCategories).where(and(
                eq(pointCategories.realmId, user.realmId),
                eq(pointCategories.isActive, true),
            )),
            getRealmSetupState(user.realmId),
        ]);

        const [balances, presentation, stats, activeRuns, unreadNotifications, currentUserAvatar, players] = await Promise.all([
            listBalancesForUser(user.id),
            getRealmPresentation(user.realmId),
            summarizeTaskStats(user.id),
            db.select({ count: sql<number>`count(*)::int` }).from(taskRuns).where(and(
                eq(taskRuns.userId, user.id),
                eq(taskRuns.status, 'active'),
            )),
            db.select({ count: sql<number>`count(*)::int` }).from(notifications).where(and(
                eq(notifications.recipientUserId, user.id),
                isNull(notifications.readAt),
            )),
            getAvatarPresentation(user.id, user.avatarStorageKey),
            listRealmPlayersWithPresence(user.realmId),
        ]);

        const response: SessionData = {
            user: {
                id: user.id,
                realmId: user.realmId,
                username: user.username,
                displayName: user.displayName,
                avatarUrl: currentUserAvatar.avatarUrl,
                avatarAsset: currentUserAvatar.avatarAsset,
                email: user.email,
                emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
                role: user.role,
                mustChangePassword: user.mustChangePassword,
                emailNotificationsEnabled: user.emailNotificationsEnabled,
                inAppNotificationsEnabled: user.inAppNotificationsEnabled,
                tokenVersion: user.tokenVersion,
            },
            balances,
            stats: {
                ...stats,
                activeTasks: activeRuns[0]?.count ?? 0,
            },
            profile: {
                email: user.email,
                emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
                emailNotificationsEnabled: user.emailNotificationsEnabled,
                inAppNotificationsEnabled: user.inAppNotificationsEnabled,
                unreadNotifications: unreadNotifications[0]?.count ?? 0,
            },
            platform: {
                platformName: presentation.settings.platformName,
                onboardingCompleted: setupState.isLaunched,
                setup: setupState,
                content: presentation.content,
                theme: presentation.theme,
                players,
                onboarding: {
                    playerCount: playerCountRow[0]?.count ?? 0,
                    categoryCount: categoryCountRow[0]?.count ?? 0,
                    needsSetup: user.role === 'admin' ? !setupState.isLaunched : false,
                    currentStep: setupState.currentStep,
                },
            },
        };

        res.json(response);
    }));
}
