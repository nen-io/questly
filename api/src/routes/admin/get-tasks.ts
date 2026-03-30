import type { Router } from 'express';

import { adminCatalogQuerySchema, asyncHandler, loadAdminTaskPage, parsePagination, parseWithSchema } from './shared';

export const registerGetAdminTasksRoute = (router: Router) => {
    router.get('/tasks', asyncHandler(async (req, res) => {
        const filters = parseWithSchema(adminCatalogQuerySchema, req.query);
        const pagination = parsePagination(req, { pageSize: 12, maxPageSize: 50 });
        res.json(await loadAdminTaskPage(req.auth!.realmId, filters, pagination));
    }));
};
