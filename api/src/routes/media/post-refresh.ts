import type { Router } from 'express';

import {
    handleRouteError,
    parseWithSchema,
    refreshAssetPayloadSchema,
    refreshSignedAssetUrl,
} from './shared';

export const registerPostRefreshMediaRoute = (router: Router) => {
    router.post('/refresh', async (req, res) => {
        try {
            const payload = parseWithSchema(refreshAssetPayloadSchema, req.body);

            // The refresh endpoint only re-signs assets already owned by the
            // caller's realm so stale signed URLs can recover without widening
            // access to arbitrary bucket keys.
            res.json(await refreshSignedAssetUrl(req.auth!.realmId, payload.asset));
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'media.refresh.failed',
                fallbackMessage: 'Unable to refresh media',
            });
        }
    });
};
