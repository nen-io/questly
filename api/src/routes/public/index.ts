import { Router } from 'express';

import { registerGetConfigRoute } from './get-config';
import { registerGetThemesRoute } from './get-themes';

export const publicRouter = Router();

registerGetConfigRoute(publicRouter);
registerGetThemesRoute(publicRouter);
