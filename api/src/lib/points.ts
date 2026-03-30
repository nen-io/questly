import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { playerPointBalances, pointCategories, users } from '../db/schema';

export interface BalanceRow {
    categoryId: number;
    slug: string;
    name: string;
    color: string;
    icon: string | null;
    balance: number;
}

export interface PointCategoryPresentation {
    categoryId: number;
    slug: string;
    name: string;
    color: string;
    icon: string | null;
}

export const ensureBalancesForUsers = async (realmId: number, userIds?: number[]) => {
    const categories = await db.select().from(pointCategories).where(and(
        eq(pointCategories.realmId, realmId),
        eq(pointCategories.isActive, true),
    ));

    if (categories.length === 0) {
        return;
    }

    const targetUsers = userIds && userIds.length > 0
        ? await db.select({ id: users.id }).from(users).where(and(
            inArray(users.id, userIds),
            eq(users.role, 'player'),
            eq(users.status, 'active'),
        ))
        : await db.select({ id: users.id }).from(users).where(and(
            eq(users.realmId, realmId),
            eq(users.role, 'player'),
            eq(users.status, 'active'),
        ));

    for (const user of targetUsers) {
        for (const category of categories) {
            await db.insert(playerPointBalances).values({
                userId: user.id,
                categoryId: category.id,
                balance: 0,
            }).onConflictDoNothing();
        }
    }
};

export const listBalancesForUser = async (userId: number): Promise<BalanceRow[]> => {
    const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
    if (!user || user.role !== 'player') {
        return [];
    }

    const rows = await db.select({
        categoryId: pointCategories.id,
        slug: pointCategories.slug,
        name: pointCategories.name,
        color: pointCategories.color,
        icon: pointCategories.icon,
        balance: playerPointBalances.balance,
    })
        .from(playerPointBalances)
        .innerJoin(pointCategories, eq(pointCategories.id, playerPointBalances.categoryId))
        .where(eq(playerPointBalances.userId, userId));

    return rows.sort((left, right) => left.name.localeCompare(right.name));
};

export const listPointCategoryPresentation = async (realmId: number, categoryIds?: number[]) => {
    const uniqueCategoryIds = Array.from(new Set((categoryIds ?? []).filter((value) => Number.isInteger(value) && value > 0)));
    const rows = await db.select({
        categoryId: pointCategories.id,
        slug: pointCategories.slug,
        name: pointCategories.name,
        color: pointCategories.color,
        icon: pointCategories.icon,
    })
        .from(pointCategories)
        .where(and(
            eq(pointCategories.realmId, realmId),
            uniqueCategoryIds.length > 0 ? inArray(pointCategories.id, uniqueCategoryIds) : undefined,
        ));

    return new Map(rows.map((row) => [row.categoryId, row] as const));
};

export const decoratePointAmountEntries = <
    T extends { categoryId: number; slug?: string | null; name: string; amount: number }
>(
    entries: T[] | null | undefined,
    presentationByCategoryId: Map<number, PointCategoryPresentation>,
) => (
        (entries ?? []).map((entry) => {
            const presentation = presentationByCategoryId.get(entry.categoryId);
            return {
                ...entry,
                slug: presentation?.slug ?? entry.slug ?? '',
                name: presentation?.name ?? entry.name,
                color: presentation?.color ?? '#1f2937',
                icon: presentation?.icon ?? null,
            };
        })
    );
