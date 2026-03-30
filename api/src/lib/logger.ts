import crypto from 'crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

type LogLevel = 'info' | 'warn' | 'error';

interface LogContext {
    [key: string]: unknown;
}

const writeLog = (level: LogLevel, event: string, context: LogContext = {}) => {
    const payload = {
        timestamp: new Date().toISOString(),
        level,
        event,
        ...context,
    };

    const line = JSON.stringify(payload);
    if (level === 'error') {
        console.error(line);
        return;
    }

    if (level === 'warn') {
        console.warn(line);
        return;
    }

    console.info(line);
};

export const serializeError = (error: unknown) => {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
        };
    }

    return {
        message: String(error),
    };
};

export const logInfo = (event: string, context?: LogContext) => writeLog('info', event, context);
export const logWarn = (event: string, context?: LogContext) => writeLog('warn', event, context);
export const logError = (event: string, context?: LogContext) => writeLog('error', event, context);

export const getRequestLogContext = (req: Request) => ({
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    userId: req.auth?.id ?? null,
    realmId: req.auth?.realmId ?? null,
    ip: req.ip,
});

export const requestLogger: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    req.requestId = req.header('x-request-id') || crypto.randomUUID();
    req.requestStartedAt = Date.now();
    res.setHeader('X-Request-Id', req.requestId);

    logInfo('http.request.started', {
        ...getRequestLogContext(req),
    });

    res.on('finish', () => {
        const durationMs = Date.now() - (req.requestStartedAt || Date.now());
        const event = res.statusCode >= 500
            ? 'http.request.failed'
            : res.statusCode >= 400
                ? 'http.request.completed_with_error'
                : 'http.request.completed';

        logInfo(event, {
            ...getRequestLogContext(req),
            statusCode: res.statusCode,
            durationMs,
        });
    });

    next();
};
