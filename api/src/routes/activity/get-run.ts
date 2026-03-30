import type { Router } from 'express';

import {
    getActivityRunById,
    handleRouteError,
    idParamSchema,
    parseWithSchema,
} from './shared';

export const registerGetRunRoute = (router: Router) => {
    router.get('/runs/:id', async (req, res) => {
        try {
            const { id: runId } = parseWithSchema(idParamSchema('run id'), req.params);
            res.json(await getActivityRunById(req.auth!.realmId, runId));
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'activity.runs.get.failed',
                fallbackMessage: 'Unable to load win',
                context: { runId: req.params.id ?? null },
            });
        }
    });
};
