import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { playerPointBalances, pointCategories, taskRuns, users } from '../db/schema';
import { HttpError } from './http';
import { listRealmPlayersWithPresence } from './players';

export interface LeaderboardEntry {
    rank: number;
    userId: number;
    displayName: string;
    avatarUrl: string | null;
    avatarAsset: { kind: 'avatar'; userId: number } | null;
    online: boolean;
    totalPoints: number;
    completedWins: number;
    isCurrentUser: boolean;
    pointSnapshot: Array<{
        categoryId: number;
        slug: string;
        name: string;
        color: string;
        icon: string | null;
        balance: number;
    }>;
}

export const listLeaderboard = async (realmId: number, currentUserId: number, offset: number, limit: number) => {
    if (!Number.isInteger(realmId) || realmId < 1 || !Number.isInteger(currentUserId) || currentUserId < 1) {
        throw new HttpError(500, 'Invalid leaderboard scope', { expose: false });
    }
    if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1) {
        throw new HttpError(500, 'Invalid leaderboard pagination', { expose: false });
    }

    const players = await listRealmPlayersWithPresence(realmId);
    const playerIds = players.map((player) => player.id);

    if (playerIds.length === 0) {
        return { total: 0, items: [] as LeaderboardEntry[] };
    }

    const [pointRows, balanceRows, completedRows] = await Promise.all([
        db.select({
            userId: playerPointBalances.userId,
            totalPoints: sql<number>`coalesce(sum(${playerPointBalances.balance}), 0)::int`,
        }).from(playerPointBalances)
            .where(inArray(playerPointBalances.userId, playerIds))
            .groupBy(playerPointBalances.userId),
        db.select({
            userId: playerPointBalances.userId,
            categoryId: pointCategories.id,
            slug: pointCategories.slug,
            name: pointCategories.name,
            color: pointCategories.color,
            icon: pointCategories.icon,
            balance: playerPointBalances.balance,
        }).from(playerPointBalances)
            .innerJoin(pointCategories, eq(pointCategories.id, playerPointBalances.categoryId))
            .where(inArray(playerPointBalances.userId, playerIds)),
        db.select({
            userId: taskRuns.userId,
            completedWins: sql<number>`count(*)::int`,
        }).from(taskRuns)
            .innerJoin(users, eq(users.id, taskRuns.userId))
            .where(and(
                inArray(taskRuns.userId, playerIds),
                eq(taskRuns.status, 'completed'),
                eq(users.realmId, realmId),
            ))
            .groupBy(taskRuns.userId),
    ]);

    const pointsByUserId = new Map(pointRows.map((row) => [row.userId, row.totalPoints]));
    const completedByUserId = new Map(completedRows.map((row) => [row.userId, row.completedWins]));
    const pointSnapshotsByUserId = balanceRows.reduce<Map<number, LeaderboardEntry['pointSnapshot']>>((accumulator, row) => {
        const current = accumulator.get(row.userId) ?? [];
        current.push({
            categoryId: row.categoryId,
            slug: row.slug,
            name: row.name,
            color: row.color,
            icon: row.icon,
            balance: row.balance,
        });
        accumulator.set(row.userId, current);
        return accumulator;
    }, new Map());

    const items = players
        .filter((player) => player.role === 'player')
        .map((player) => ({
            userId: player.id,
            displayName: player.displayName,
            avatarUrl: player.avatarUrl,
            avatarAsset: player.avatarAsset,
            online: player.online,
            totalPoints: pointsByUserId.get(player.id) ?? 0,
            completedWins: completedByUserId.get(player.id) ?? 0,
            isCurrentUser: player.id === currentUserId,
            pointSnapshot: (pointSnapshotsByUserId.get(player.id) ?? []).sort((left, right) =>
                right.balance - left.balance || left.name.localeCompare(right.name)),
        }))
        .sort((left, right) =>
            right.totalPoints - left.totalPoints
            || right.completedWins - left.completedWins
            || left.displayName.localeCompare(right.displayName))
        .map((entry, index) => ({
            ...entry,
            rank: index + 1,
        }))
    return {
        total: items.length,
        items: items.slice(offset, offset + limit),
    };
};
