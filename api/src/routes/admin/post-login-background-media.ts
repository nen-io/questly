import type { RequestHandler, Router } from 'express';

import { handleRouteError } from '../../lib/http';
import { loginBackgroundMediaUpload, uploadLoginBackgroundMediaFile } from '../../lib/contentMedia';

const uploadLoginBackgroundMedia: RequestHandler = (req, res, next) => {
    const middleware = loginBackgroundMediaUpload.single('file') as unknown as RequestHandler;

    middleware(req, res, (uploadError) => {
        if (uploadError) {
            handleRouteError(req, res, uploadError, {
                event: 'admin.login_background_media.upload_failed',
                fallbackMessage: 'Unable to upload background media',
            });
            return;
        }

        next();
    });
};

export const registerPostLoginBackgroundMediaRoute = (router: Router) => {
    router.post('/settings/login-background-media', uploadLoginBackgroundMedia, async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'Background media file is required' });
            }

            res.json(await uploadLoginBackgroundMediaFile({
                realmId: req.auth!.realmId,
                file: req.file,
            }));
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'admin.login_background_media.upload_failed',
                fallbackMessage: 'Unable to upload background media',
            });
        }
    });
};
