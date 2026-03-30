import type { Router } from 'express';

import { buildPaginatedResult, db, eq, handleRouteError, listPlatformEventFeed, paginationQuerySchema, parsePagination, parseWithSchema, platformEvents, sql } from './shared';

export const registerGetFeedRoute = (router: Router) => {
    router.get('/feed', async (req, res) => {
        try {
            parseWithSchema(paginationQuerySchema, req.query);
            const { page, pageSize, offset } = parsePagination(req, { pageSize: 12, maxPageSize: 50 });
            const [countRow] = await db.select({
                count: sql<number>`count(*)::int`,
            }).from(platformEvents).where(eq(platformEvents.realmId, req.auth!.realmId));

            const items = await listPlatformEventFeed(req.auth!.realmId, offset, pageSize);
            res.json(buildPaginatedResult(items, countRow?.count ?? 0, page, pageSize));
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'activity.feed.failed',
                fallbackMessage: 'Unable to load activity feed',
            });
        }
    });
};
