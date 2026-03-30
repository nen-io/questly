import { Router } from 'express';

import { authenticate } from '../../auth/middleware';
import { registerListRewardsRoute } from './get-list';
import { registerListRewardPurchasesRoute } from './get-purchases';
import { registerGetRewardBySlugRoute } from './get-detail';
import { registerPurchaseRewardRoute } from './post-purchase';
import { registerRedeemRewardRoute } from './post-redeem';

export const rewardRouter = Router();

rewardRouter.use(authenticate);

registerListRewardsRoute(rewardRouter);
registerListRewardPurchasesRoute(rewardRouter);
registerGetRewardBySlugRoute(rewardRouter);
registerPurchaseRewardRoute(rewardRouter);
registerRedeemRewardRoute(rewardRouter);
