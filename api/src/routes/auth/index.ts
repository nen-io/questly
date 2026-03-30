import { Router } from 'express';

import { registerAdminAccessRoute } from './post-admin-access';
import { registerChangePasswordRoute } from './post-change-password';
import { registerCompletePasswordSetupRoute } from './post-complete-password-setup';
import { registerLoginRoute } from './post-login';
import { registerLogoutRoute } from './post-logout';
import { registerRequestEmailVerificationRoute } from './post-request-email-verification';
import { registerVerifyEmailRoute } from './post-verify-email';
import { registerGetSessionRoute } from './get-me';
import { registerGetSessionsRoute } from './get-sessions';
import { registerUpdateAvatarRoute } from './put-avatar';
import { registerUpdateEmailRoute } from './put-email';

export const authRouter = Router();

registerLoginRoute(authRouter);
registerAdminAccessRoute(authRouter);
registerLogoutRoute(authRouter);
registerGetSessionRoute(authRouter);
registerChangePasswordRoute(authRouter);
registerCompletePasswordSetupRoute(authRouter);
registerUpdateEmailRoute(authRouter);
registerUpdateAvatarRoute(authRouter);
registerRequestEmailVerificationRoute(authRouter);
registerGetSessionsRoute(authRouter);
registerVerifyEmailRoute(authRouter);
