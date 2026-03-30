import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { notifications, pointCategories, taskRuns, users } from '../../db/schema';
import { authenticate } from '../../auth/middleware';
import { clearAuthCookie, readAuthCookieName, setAuthCookie, signToken, verifyToken } from '../../auth/jwt';
import { deleteAvatarStorageKey, signAvatarStorageKey, uploadAvatarFromDataUrl } from '../../lib/avatar';
import { getRealmPresentation } from '../../lib/content';
import { sendVerificationEmail, verifyEmailToken } from '../../lib/emailVerification';
import { asyncHandler, handleRouteError } from '../../lib/http';
import { listRealmPlayersWithPresence } from '../../lib/players';
import { publishInvalidate } from '../../lib/realtime';
import { getRequestLogContext, logWarn, serializeError } from '../../lib/logger';
import {
    adminAccessPayloadSchema,
    changePasswordPayloadSchema,
    loginPayloadSchema,
    parseWithSchema,
    updateAvatarPayloadSchema,
    updateEmailSettingsPayloadSchema,
    verifyEmailPayloadSchema,
} from '../../lib/schemas';
import { getRealmSetupState, markRealmOnboardingInProgress } from '../../lib/onboarding';
import { ensureBalancesForUsers, listBalancesForUser } from '../../lib/points';
import { hashPassword, verifyPassword } from '../../lib/passwords';
import { createUserSession, endUserSession, endUserSessionsForUser, listSessionsForUser } from '../../lib/sessionManager';
import { summarizeTaskStats } from '../../lib/tasks';
import type { SessionData } from '../../../../shared/contracts';

export const startAuthenticatedSession = async (user: typeof users.$inferSelect, markSetupInProgress = false) => {
    const session = await createUserSession({
        userId: user.id,
        realmId: user.realmId,
        tokenVersion: user.tokenVersion,
    });
    const token = signToken({
        sub: String(user.id),
        realmId: user.realmId,
        role: user.role as 'admin' | 'player',
        username: user.username,
        tokenVersion: user.tokenVersion,
        sessionId: session.sessionId,
    });

    await db.update(users)
        .set({ lastLoginAt: new Date(), updatedAt: new Date() })
        .where(eq(users.id, user.id));

    if (markSetupInProgress && user.role === 'admin') {
        await markRealmOnboardingInProgress(user.realmId);
    }

    return token;
};

export {
    and,
    asyncHandler,
    authenticate,
    clearAuthCookie,
    db,
    deleteAvatarStorageKey,
    endUserSession,
    endUserSessionsForUser,
    ensureBalancesForUsers,
    eq,
    getRealmPresentation,
    getRealmSetupState,
    getRequestLogContext,
    handleRouteError,
    hashPassword,
    isNull,
    listBalancesForUser,
    listRealmPlayersWithPresence,
    listSessionsForUser,
    logWarn,
    markRealmOnboardingInProgress,
    notifications,
    parseWithSchema,
    pointCategories,
    publishInvalidate,
    readAuthCookieName,
    sendVerificationEmail,
    serializeError,
    setAuthCookie,
    signAvatarStorageKey,
    signToken,
    sql,
    summarizeTaskStats,
    taskRuns,
    updateAvatarPayloadSchema,
    updateEmailSettingsPayloadSchema,
    uploadAvatarFromDataUrl,
    users,
    verifyEmailPayloadSchema,
    verifyEmailToken,
    verifyPassword,
    verifyToken,
    adminAccessPayloadSchema,
    changePasswordPayloadSchema,
    loginPayloadSchema,
};

export type { SessionData };
