import type { Router } from 'express';
import { and, desc, eq } from 'drizzle-orm';

import { db } from '../../db/client';
import { notifications } from '../../db/schema';
import { asyncHandler } from '../../lib/http';
import { markAllNotificationsRead } from '../../lib/notifications';
import { publishInvalidate } from '../../lib/realtime';

export const registerMarkAllNotificationsReadRoute = (router: Router) => {
    router.post('/read-all', asyncHandler(async (req, res) => {
        await markAllNotificationsRead(req.auth!.id);
        const rows = await db.select().from(notifications).where(and(
            eq(notifications.recipientUserId, req.auth!.id),
        )).orderBy(desc(notifications.createdAt));

        publishInvalidate({
            realmId: req.auth!.realmId,
            reason: 'notifications.read_all',
            queryKeys: [['notifications'], ['session']],
            userIds: [req.auth!.id],
        });
        res.json(rows);
    }));
};
