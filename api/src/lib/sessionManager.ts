import crypto from 'crypto';
import { and, desc, eq, gt, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { userSessions } from '../db/schema';

const sessionTtlMs = 7 * 24 * 60 * 60 * 1000;
const onlineThresholdMs = 90 * 1000;
const touchThrottleMs = 30 * 1000;

export const sessionOnlineThresholdMs = onlineThresholdMs;

export const createUserSession = async (input: {
    userId: number;
    realmId: number;
    tokenVersion: number;
}) => {
    const now = new Date();
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(now.getTime() + sessionTtlMs);

    const [created] = await db.insert(userSessions).values({
        sessionId,
        userId: input.userId,
        realmId: input.realmId,
        tokenVersion: input.tokenVersion,
        status: 'active',
        lastSeenAt: now,
        expiresAt,
        updatedAt: now,
    }).returning();

    return created;
};

export const getActiveSession = async (sessionId: string) => {
    const [session] = await db.select().from(userSessions).where(and(
        eq(userSessions.sessionId, sessionId),
        eq(userSessions.status, 'active'),
    )).limit(1);

    if (!session) {
        return null;
    }

    if (session.expiresAt <= new Date()) {
        await db.update(userSessions)
            .set({
                status: 'expired',
                endedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(userSessions.id, session.id));
        return null;
    }

    return session;
};

export const touchUserSession = async (sessionId: string, options?: { force?: boolean }) => {
    const session = await getActiveSession(sessionId);
    if (!session) {
        return null;
    }

    if (!options?.force && Date.now() - session.lastSeenAt.getTime() < touchThrottleMs) {
        return session;
    }

    const now = new Date();
    const [updated] = await db.update(userSessions)
        .set({
            lastSeenAt: now,
            updatedAt: now,
        })
        .where(eq(userSessions.id, session.id))
        .returning();

    return updated ?? session;
};

export const endUserSession = async (sessionId: string) => {
    const now = new Date();
    const [updated] = await db.update(userSessions)
        .set({
            status: 'ended',
            endedAt: now,
            updatedAt: now,
        })
        .where(and(
            eq(userSessions.sessionId, sessionId),
            eq(userSessions.status, 'active'),
        ))
        .returning();

    return updated ?? null;
};

export const endUserSessionsForUser = async (userId: number) => {
    const now = new Date();
    return db.update(userSessions)
        .set({
            status: 'ended',
            endedAt: now,
            updatedAt: now,
        })
        .where(and(
            eq(userSessions.userId, userId),
            eq(userSessions.status, 'active'),
        ));
};

export const listSessionsForUser = async (userId: number) => db.select({
    sessionId: userSessions.sessionId,
    status: userSessions.status,
    lastSeenAt: userSessions.lastSeenAt,
    expiresAt: userSessions.expiresAt,
    endedAt: userSessions.endedAt,
    createdAt: userSessions.createdAt,
}).from(userSessions).where(eq(userSessions.userId, userId)).orderBy(desc(userSessions.createdAt));

export const listOnlineUserIds = async (realmId: number) => {
    const threshold = new Date(Date.now() - onlineThresholdMs);
    const rows = await db.select({ userId: userSessions.userId }).from(userSessions).where(and(
        eq(userSessions.realmId, realmId),
        eq(userSessions.status, 'active'),
        gt(userSessions.lastSeenAt, threshold),
        gt(userSessions.expiresAt, new Date()),
    ));

    return Array.from(new Set(rows.map((row) => row.userId)));
};

export const listOnlineSessionIds = async (realmId: number, userIds: number[]) => {
    if (userIds.length === 0) {
        return [];
    }

    const threshold = new Date(Date.now() - onlineThresholdMs);
    const rows = await db.select({
        sessionId: userSessions.sessionId,
        userId: userSessions.userId,
    }).from(userSessions).where(and(
        eq(userSessions.realmId, realmId),
        inArray(userSessions.userId, userIds),
        eq(userSessions.status, 'active'),
        gt(userSessions.lastSeenAt, threshold),
        gt(userSessions.expiresAt, new Date()),
    ));

    return rows;
};
