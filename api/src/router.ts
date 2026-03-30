import { Router } from 'express';
import { publicRouter } from './routes/public';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';
import { taskRouter } from './routes/tasks';
import { rewardRouter } from './routes/rewards';
import { notificationRouter } from './routes/notifications';
import { activityRouter } from './routes/activity';
import { mediaRouter } from './routes/media';

export const appRouter = Router();

appRouter.use('/public', publicRouter);
appRouter.use('/auth', authRouter);
appRouter.use('/admin', adminRouter);
appRouter.use('/tasks', taskRouter);
appRouter.use('/rewards', rewardRouter);
appRouter.use('/notifications', notificationRouter);
appRouter.use('/activity', activityRouter);
appRouter.use('/media', mediaRouter);
