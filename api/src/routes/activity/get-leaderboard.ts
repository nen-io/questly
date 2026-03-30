import type { Router } from 'express';

import { buildPaginatedResult, handleRouteError, listLeaderboard, paginationQuerySchema, parsePagination, parseWithSchema } from './shared';

export const registerGetLeaderboardRoute = (router: Router) => {
    router.get('/leaderboard', async (req, res) => {
        try {
            parseWithSchema(paginationQuerySchema, req.query);
            const { page, pageSize, offset } = parsePagination(req, { pageSize: 10, maxPageSize: 50 });
            const leaderboard = await listLeaderboard(req.auth!.realmId, req.auth!.id, offset, pageSize);

            res.json(buildPaginatedResult(leaderboard.items, leaderboard.total, page, pageSize));
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'activity.leaderboard.failed',
                fallbackMessage: 'Unable to load leaderboard',
            });
        }
    });
};
