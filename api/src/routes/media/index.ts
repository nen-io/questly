import { Router } from 'express';

import { authenticate } from '../../auth/middleware';
import { registerGetTaskRunMediaDownloadRoute } from './get-task-run-download';
import { registerPostRefreshMediaRoute } from './post-refresh';

export const mediaRouter = Router();

mediaRouter.use(authenticate);

registerGetTaskRunMediaDownloadRoute(mediaRouter);
registerPostRefreshMediaRoute(mediaRouter);
