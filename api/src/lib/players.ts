import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';
import type { PlatformPlayer } from '../../../shared/contracts';
import { getAvatarPresentation } from './avatar';
import { listOnlineUserIds } from './sessionManager';
import { listConnectedUserIds } from './realtime';

export const listRealmPlayersWithPresence = async (realmId: number): Promise<Array<PlatformPlayer & { mustChangePassword: boolean }>> => {
    const [rows, recentOnlineIds] = await Promise.all([
        db.select({
            id: users.id,
            username: users.username,
            displayName: users.displayName,
            role: users.role,
            status: users.status,
            mustChangePassword: users.mustChangePassword,
            avatarStorageKey: users.avatarStorageKey,
        }).from(users).where(and(
            eq(users.realmId, realmId),
            eq(users.status, 'active'),
        )).orderBy(asc(users.createdAt)),
        listOnlineUserIds(realmId),
    ]);

    const connectedNow = new Set(listConnectedUserIds(realmId));
    const onlineIds = new Set([...recentOnlineIds, ...connectedNow]);
    const avatars = await Promise.all(rows.map((row) => getAvatarPresentation(row.id, row.avatarStorageKey)));

    return rows.map((row, index) => ({
        id: row.id,
        username: row.username,
        displayName: row.displayName,
        role: row.role as PlatformPlayer['role'],
        status: row.status,
        mustChangePassword: row.mustChangePassword,
        avatarUrl: avatars[index].avatarUrl,
        avatarAsset: avatars[index].avatarAsset,
        online: onlineIds.has(row.id),
    }));
};
