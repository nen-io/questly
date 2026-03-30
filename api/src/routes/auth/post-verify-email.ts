import type { Router } from 'express';

import { handleRouteError, parseWithSchema, verifyEmailPayloadSchema, verifyEmailToken } from './shared';

export function registerVerifyEmailRoute(router: Router) {
    router.post('/email/verify', async (req, res) => {
        try {
            const payload = parseWithSchema(verifyEmailPayloadSchema, req.body);
            await verifyEmailToken(payload.token);
            res.json({ success: true });
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'auth.verify_email.failed',
                fallbackMessage: 'Unable to verify email',
            });
        }
    });
}
