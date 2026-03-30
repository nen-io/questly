import type { NextFunction, Request, Response } from 'express';
import { getRequestLogContext, logError, serializeError } from './logger';

export class HttpError extends Error {
    statusCode: number;

    expose: boolean;

    constructor(statusCode: number, message: string, options?: { expose?: boolean }) {
        super(message);
        this.name = 'HttpError';
        this.statusCode = statusCode;
        this.expose = options?.expose ?? statusCode < 500;
    }
}

export const asyncHandler = (
    handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown,
) => (
    req: Request,
    res: Response,
    next: NextFunction,
) => Promise.resolve(handler(req, res, next)).catch(next);

export const getErrorStatusCode = (error: unknown) => (
    error instanceof HttpError ? error.statusCode : 500
);

export const getErrorMessage = (error: unknown, fallbackMessage: string) => {
    if (error instanceof HttpError && error.expose) {
        return error.message;
    }

    return fallbackMessage;
};

export const handleRouteError = (
    req: Request,
    res: Response,
    error: unknown,
    input: {
        event: string;
        fallbackMessage: string;
        context?: Record<string, unknown>;
    },
) => {
    const statusCode = getErrorStatusCode(error);

    logError(input.event, {
        ...getRequestLogContext(req),
        ...input.context,
        statusCode,
        error: serializeError(error),
    });

    return res.status(statusCode).json({
        error: getErrorMessage(error, input.fallbackMessage),
        requestId: req.requestId,
    });
};
