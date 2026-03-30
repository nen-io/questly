import type { SessionUser } from '../auth/types';

declare global {
    namespace Express {
        interface Request {
            auth?: SessionUser;
            requestId?: string;
            requestStartedAt?: number;
        }
    }
}

export {};
