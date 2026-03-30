import type { Router } from 'express';

import { markNotificationRead } from '../../lib/notifications';
import { publishInvalidate } from '../../lib/realtime';
import { asyncHandler } from '../../lib/http';
import { idParamSchema, parseWithSchema } from '../../lib/schemas';

export const registerMarkNotificationReadRoute = (router: Router) => {
    router.post('/:id/read', asyncHandler(async (req, res) => {
        const { id: notificationId } = parseWithSchema(idParamSchema('notification id'), req.params);

        const notification = await markNotificationRead(notificationId, req.auth!.id);
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        publishInvalidate({
            realmId: req.auth!.realmId,
            reason: 'notifications.read',
            queryKeys: [['notifications'], ['session']],
            userIds: [req.auth!.id],
        });
        res.json(notification);
    }));
};
