import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import type { TokenPayload } from './types';

const cookieName = process.env.AUTH_COOKIE_NAME || 'questly_auth';
const jwtSecret = process.env.JWT_SECRET || 'questly_dev_secret';

export const signToken = (payload: TokenPayload) => jwt.sign(payload, jwtSecret, { expiresIn: '7d' });

export const verifyToken = (token: string) => jwt.verify(token, jwtSecret) as TokenPayload;

export const setAuthCookie = (res: Response, token: string) => {
    res.cookie(cookieName, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
    });
};

export const clearAuthCookie = (res: Response) => {
    res.clearCookie(cookieName, { path: '/' });
};

export const readAuthCookieName = () => cookieName;
