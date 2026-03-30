import type { NextFunction, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';
import { readAuthCookieName, verifyToken } from './jwt';
import type { SessionUser } from './types';
import { getRequestLogContext, logWarn, serializeError } from '../lib/logger';
import { getActiveSession, touchUserSession } from '../lib/sessionManager';

const unauthorized = (res: Response, message = 'Unauthorized') => res.status(401).json({ error: message });

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.[readAuthCookieName()];
    if (!token) {
        return unauthorized(res);
    }

    try {
        const payload = verifyToken(token);
        const session = await getActiveSession(payload.sessionId);
        if (!session || session.userId !== Number(payload.sub) || session.realmId !== payload.realmId) {
            return unauthorized(res, 'Session expired');
        }

        const [user] = await db.select().from(users).where(eq(users.id, Number(payload.sub))).limit(1);

        if (!user || user.status !== 'active') {
            return unauthorized(res);
        }

        if (user.tokenVersion !== payload.tokenVersion || session.tokenVersion !== payload.tokenVersion) {
            return unauthorized(res, 'Session expired');
        }

        const auth: SessionUser = {
            id: user.id,
            realmId: user.realmId,
            sessionId: session.sessionId,
            username: user.username,
            displayName: user.displayName,
            avatarStorageKey: user.avatarStorageKey,
            email: user.email,
            emailVerifiedAt: user.emailVerifiedAt,
            role: user.role as 'admin' | 'player',
            mustChangePassword: user.mustChangePassword,
            emailNotificationsEnabled: user.emailNotificationsEnabled,
            inAppNotificationsEnabled: user.inAppNotificationsEnabled,
            tokenVersion: user.tokenVersion,
        };

        req.auth = auth;
        await touchUserSession(session.sessionId);
        next();
    } catch (_error) {
        logWarn('auth.invalid_session', {
            ...getRequestLogContext(req),
            error: serializeError(_error),
        });
        return unauthorized(res, 'Invalid session');
    }
};

export const requireRole = (...roles: Array<'admin' | 'player'>) => (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    next();
};
