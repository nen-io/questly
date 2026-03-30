import { Router } from 'express';

import { authenticate } from '../../auth/middleware';
import { registerListNotificationsRoute } from './get-list';
import { registerMarkNotificationReadRoute } from './post-read';
import { registerMarkAllNotificationsReadRoute } from './post-read-all';

export const notificationRouter = Router();

notificationRouter.use(authenticate);

registerListNotificationsRoute(notificationRouter);
registerMarkNotificationReadRoute(notificationRouter);
registerMarkAllNotificationsReadRoute(notificationRouter);
