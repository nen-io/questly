import type { Router } from 'express';

import {
    getTaskRunMediaDownloadUrl,
    handleRouteError,
    parseWithSchema,
} from './shared';
import { idParamSchema } from '../../lib/schemas';

export const registerGetTaskRunMediaDownloadRoute = (router: Router) => {
    router.get('/task-runs/:id/download', async (req, res) => {
        try {
            const { id: mediaId } = parseWithSchema(idParamSchema('media id'), req.params);
            res.redirect(await getTaskRunMediaDownloadUrl(req.auth!.realmId, mediaId));
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'media.task_run.download.failed',
                fallbackMessage: 'Unable to download media',
                context: { mediaId: req.params.id ?? null },
            });
        }
    });
};
