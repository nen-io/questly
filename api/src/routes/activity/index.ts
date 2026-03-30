import { Router } from 'express';

import { authenticate } from '../../auth/middleware';
import { registerGetLeaderboardRoute } from './get-leaderboard';
import { registerGetFeedRoute } from './get-feed';
import { registerGetRunRoute } from './get-run';
import { registerGetRunsRoute } from './get-runs';
import { registerGetRunMediaRoute } from './get-run-media';
import { registerGetRunCommentsRoute } from './get-run-comments';
import { registerPostRunCommentRoute } from './post-run-comment';

export const activityRouter = Router();

activityRouter.use(authenticate);

registerGetLeaderboardRoute(activityRouter);
registerGetFeedRoute(activityRouter);
registerGetRunRoute(activityRouter);
registerGetRunsRoute(activityRouter);
registerGetRunMediaRoute(activityRouter);
registerGetRunCommentsRoute(activityRouter);
registerPostRunCommentRoute(activityRouter);
