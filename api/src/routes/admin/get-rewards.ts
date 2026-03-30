import type { Router } from 'express';

import { adminCatalogQuerySchema, asyncHandler, loadAdminRewardPage, parsePagination, parseWithSchema } from './shared';

export const registerGetAdminRewardsRoute = (router: Router) => {
    router.get('/rewards', asyncHandler(async (req, res) => {
        const filters = parseWithSchema(adminCatalogQuerySchema, req.query);
        const pagination = parsePagination(req, { pageSize: 12, maxPageSize: 50 });
        res.json(await loadAdminRewardPage(req.auth!.realmId, filters, pagination));
    }));
};
