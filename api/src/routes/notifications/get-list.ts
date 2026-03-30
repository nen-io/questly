import type { Router } from 'express';
import { desc, eq } from 'drizzle-orm';

import { db } from '../../db/client';
import { notifications } from '../../db/schema';
import { asyncHandler } from '../../lib/http';

export const registerListNotificationsRoute = (router: Router) => {
    router.get('/', asyncHandler(async (req, res) => {
        const rows = await db.select().from(notifications)
            .where(eq(notifications.recipientUserId, req.auth!.id))
            .orderBy(desc(notifications.createdAt));

        res.json(rows);
    }));
};
