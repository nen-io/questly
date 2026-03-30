import { Router } from 'express';

import { authenticate } from '../../auth/middleware';
import { registerListTasksRoute } from './get-list';
import { registerGetTaskBySlugRoute } from './get-detail';
import { registerStartTaskRoute } from './post-start';
import { registerCompleteTaskRoute } from './post-complete';
import { registerQueueRunMediaRoute } from './post-run-media';

export const taskRouter = Router();

taskRouter.use(authenticate);

registerListTasksRoute(taskRouter);
registerGetTaskBySlugRoute(taskRouter);
registerStartTaskRoute(taskRouter);
registerCompleteTaskRoute(taskRouter);
registerQueueRunMediaRoute(taskRouter);
