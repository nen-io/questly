import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { appRouter } from './router';
import { getErrorMessage, getErrorStatusCode } from './lib/http';
import { getRequestLogContext, logError, logInfo, requestLogger, serializeError } from './lib/logger';
import { isOriginAllowed } from './lib/origins';
import { attachRealtimeServer } from './lib/realtime';
import { startTaskExpirySweep } from './lib/taskExpirySweep';
import { startTaskRunMediaProcessingSweep } from './lib/taskRunMediaProcessing';

dotenv.config();

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || process.env.API_PORT || 3000;

app.disable('x-powered-by');

app.use(cors({
    origin(origin, callback) {
        if (isOriginAllowed(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: true,
    exposedHeaders: ['X-Request-Id'],
}));
app.use(requestLogger);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', message: 'Questly API is running' });
});

app.use('/api', appRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const req = _req;
    const statusCode = getErrorStatusCode(err);

    logError('http.unhandled_error', {
        ...getRequestLogContext(req),
        statusCode,
        error: serializeError(err),
    });

    res.status(statusCode).json({
        error: getErrorMessage(err, 'Internal server error'),
        requestId: req.requestId,
    });
});

attachRealtimeServer(server);
startTaskExpirySweep();
startTaskRunMediaProcessingSweep();

server.listen(Number(port), '0.0.0.0', () => {
    logInfo('server.started', {
        port: Number(port),
        nodeEnv: process.env.NODE_ENV || 'development',
    });
});

process.on('unhandledRejection', (error) => {
    logError('process.unhandled_rejection', {
        error: serializeError(error),
    });
});

process.on('uncaughtException', (error) => {
    logError('process.uncaught_exception', {
        error: serializeError(error),
    });
});
