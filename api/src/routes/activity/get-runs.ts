import type { Router } from 'express';

import {
    activityRunsQuerySchema,
    and,
    buildPaginatedResult,
    db,
    desc,
    eq,
    handleRouteError,
    HttpError,
    parsePagination,
    parseWithSchema,
    sql,
    buildActivityRunItems,
    activityRunSelectFields,
    taskRuns,
    tasks,
    users,
} from './shared';

export const registerGetRunsRoute = (router: Router) => {
    router.get('/runs', async (req, res) => {
        try {
            const query = parseWithSchema(activityRunsQuerySchema, req.query);
            const { page, pageSize, offset } = parsePagination(req, { pageSize: 10, maxPageSize: 50 });
            const search = query.search ?? null;
            const playerId = query.playerId ?? null;

            if (playerId !== null) {
                const [player] = await db.select({ id: users.id }).from(users).where(and(
                    eq(users.id, playerId),
                    eq(users.realmId, req.auth!.realmId),
                    eq(users.status, 'active'),
                )).limit(1);

                if (!player) {
                    throw new HttpError(404, 'Player not found');
                }
            }

            const searchPattern = search ? `%${search}%` : null;
            const whereClause = and(
                eq(tasks.realmId, req.auth!.realmId),
                eq(taskRuns.status, 'completed'),
                playerId !== null ? eq(taskRuns.userId, playerId) : undefined,
                searchPattern
                    ? sql`(${tasks.title} ilike ${searchPattern} or ${users.displayName} ilike ${searchPattern} or coalesce(${taskRuns.notes}, '') ilike ${searchPattern})`
                    : undefined,
            );

            const [countRows, rows] = await Promise.all([
                db.select({
                    count: sql<number>`count(*)::int`,
                })
                    .from(taskRuns)
                    .innerJoin(tasks, eq(tasks.id, taskRuns.taskId))
                    .innerJoin(users, eq(users.id, taskRuns.userId))
                    .where(whereClause),
                db.select(activityRunSelectFields)
                    .from(taskRuns)
                    .innerJoin(tasks, eq(tasks.id, taskRuns.taskId))
                    .innerJoin(users, eq(users.id, taskRuns.userId))
                    .where(whereClause)
                    .orderBy(desc(taskRuns.resolvedAt))
                    .limit(pageSize)
                    .offset(offset),
            ]);

            const items = await buildActivityRunItems(req.auth!.realmId, rows);

            res.json(buildPaginatedResult(items, countRows[0]?.count ?? 0, page, pageSize));
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'activity.runs.list.failed',
                fallbackMessage: 'Unable to load wins',
                context: {
                    page: req.query.page ?? null,
                    pageSize: req.query.pageSize ?? null,
                    playerId: req.query.playerId ?? null,
                    search: req.query.search ?? null,
                },
            });
        }
    });
};
