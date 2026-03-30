import type { IncomingMessage } from 'http';
import type { Server as HttpServer } from 'http';
import { WebSocket, WebSocketServer, type RawData } from 'ws';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';
import { readAuthCookieName, verifyToken } from '../auth/jwt';
import { getActiveSession, touchUserSession } from './sessionManager';
import { logInfo, logWarn, serializeError } from './logger';
import { isOriginAllowed } from './origins';

type QueryKey = string[];

interface RealtimeNotificationPayload {
    id: number;
    title: string;
    body: string;
    link: string | null;
    type: string;
    createdAt: string;
}

interface RealtimeClient {
    socket: WebSocket;
    sessionId: string;
    userId: number;
    realmId: number;
}

interface RealtimeAuthContext {
    sessionId: string;
    userId: number;
    realmId: number;
}

const clientsByRealm = new Map<number, Set<RealtimeClient>>();
const connectionsByRealmUser = new Map<string, number>();
let websocketServer: WebSocketServer | null = null;

const parseCookies = (cookieHeader: string | undefined) => {
    if (!cookieHeader) {
        return {};
    }

    return cookieHeader.split(';').reduce<Record<string, string>>((accumulator, pair) => {
        const separatorIndex = pair.indexOf('=');
        if (separatorIndex < 0) {
            return accumulator;
        }

        const key = pair.slice(0, separatorIndex).trim();
        const value = pair.slice(separatorIndex + 1).trim();
        accumulator[key] = decodeURIComponent(value);
        return accumulator;
    }, {});
};

const getRealmUserKey = (realmId: number, userId: number) => `${realmId}:${userId}`;

const incrementConnectionCount = (realmId: number, userId: number) => {
    const key = getRealmUserKey(realmId, userId);
    connectionsByRealmUser.set(key, (connectionsByRealmUser.get(key) ?? 0) + 1);
};

const decrementConnectionCount = (realmId: number, userId: number) => {
    const key = getRealmUserKey(realmId, userId);
    const next = (connectionsByRealmUser.get(key) ?? 0) - 1;

    if (next <= 0) {
        connectionsByRealmUser.delete(key);
        return;
    }

    connectionsByRealmUser.set(key, next);
};

const resolveRealtimeAuth = async (request: IncomingMessage): Promise<RealtimeAuthContext | null> => {
    try {
        const cookies = parseCookies(request.headers.cookie);
        const token = cookies[readAuthCookieName()];
        if (!token) {
            return null;
        }

        const payload = verifyToken(token);
        const session = await getActiveSession(payload.sessionId);
        if (!session || session.userId !== Number(payload.sub) || session.tokenVersion !== payload.tokenVersion) {
            return null;
        }

        const [user] = await db.select({
            id: users.id,
            realmId: users.realmId,
            status: users.status,
            tokenVersion: users.tokenVersion,
        }).from(users).where(eq(users.id, Number(payload.sub))).limit(1);

        if (!user || user.status !== 'active' || user.realmId !== payload.realmId || user.tokenVersion !== payload.tokenVersion) {
            return null;
        }

        await touchUserSession(session.sessionId, { force: true });

        return {
            sessionId: session.sessionId,
            userId: user.id,
            realmId: user.realmId,
        };
    } catch (error) {
        logWarn('realtime.auth_failed', {
            error: serializeError(error),
            path: request.url ?? null,
        });
        return null;
    }
};

const sendMessage = (socket: WebSocket, payload: unknown) => {
    if (socket.readyState !== WebSocket.OPEN) {
        return;
    }

    socket.send(JSON.stringify(payload));
};

const addClient = (client: RealtimeClient) => {
    const clients = clientsByRealm.get(client.realmId) ?? new Set<RealtimeClient>();
    clients.add(client);
    clientsByRealm.set(client.realmId, clients);
    incrementConnectionCount(client.realmId, client.userId);
};

const removeClient = (client: RealtimeClient) => {
    const clients = clientsByRealm.get(client.realmId);
    if (clients) {
        clients.delete(client);
        if (clients.size === 0) {
            clientsByRealm.delete(client.realmId);
        }
    }

    decrementConnectionCount(client.realmId, client.userId);
};

const realmClients = (realmId: number) => Array.from(clientsByRealm.get(realmId) ?? []);

export const listConnectedUserIds = (realmId: number) => {
    const userIds = new Set<number>();
    for (const client of realmClients(realmId)) {
        userIds.add(client.userId);
    }
    return Array.from(userIds);
};

export const publishInvalidate = (input: {
    realmId: number;
    reason: string;
    queryKeys: QueryKey[];
    userIds?: number[];
}) => {
    const queryKeys = input.queryKeys.filter((queryKey) => Array.isArray(queryKey) && queryKey.length > 0);
    if (queryKeys.length === 0) {
        return;
    }

    const targetUserIds = input.userIds ? new Set(input.userIds) : null;
    for (const client of realmClients(input.realmId)) {
        if (targetUserIds && !targetUserIds.has(client.userId)) {
            continue;
        }

        sendMessage(client.socket, {
            type: 'invalidate',
            reason: input.reason,
            queryKeys,
            sentAt: new Date().toISOString(),
        });
    }
};

export const publishNotificationEvent = (input: {
    realmId: number;
    userId: number;
    notification: RealtimeNotificationPayload;
}) => {
    for (const client of realmClients(input.realmId)) {
        if (client.userId !== input.userId) {
            continue;
        }

        sendMessage(client.socket, {
            type: 'notification',
            notification: input.notification,
            sentAt: new Date().toISOString(),
        });
    }
};

export const attachRealtimeServer = (server: HttpServer) => {
    if (websocketServer) {
        return websocketServer;
    }

    const wss = new WebSocketServer({ noServer: true });
    websocketServer = wss;

    server.on('upgrade', async (request, socket, head) => {
        const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
        if (url.pathname !== '/api/live') {
            return;
        }

        if (!isOriginAllowed(request.headers.origin)) {
            socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
            socket.destroy();
            return;
        }

        const auth = await resolveRealtimeAuth(request);
        if (!auth) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
            const client: RealtimeClient = {
                socket: ws,
                sessionId: auth.sessionId,
                userId: auth.userId,
                realmId: auth.realmId,
            };

            addClient(client);

            sendMessage(ws, {
                type: 'connected',
                sessionId: auth.sessionId,
                sentAt: new Date().toISOString(),
            });

            publishInvalidate({
                realmId: auth.realmId,
                reason: 'presence.connected',
                queryKeys: [['session'], ['admin-bootstrap']],
            });

            ws.on('message', async (message: RawData) => {
                try {
                    const payload = JSON.parse(String(message));
                    if (payload?.type === 'heartbeat') {
                        await touchUserSession(auth.sessionId, { force: true });
                        sendMessage(ws, {
                            type: 'heartbeat_ack',
                            sentAt: new Date().toISOString(),
                        });
                    }
                } catch (error) {
                    logWarn('realtime.message_parse_failed', {
                        realmId: auth.realmId,
                        userId: auth.userId,
                        error: serializeError(error),
                    });
                }
            });

            ws.on('close', () => {
                removeClient(client);
                publishInvalidate({
                    realmId: auth.realmId,
                    reason: 'presence.disconnected',
                    queryKeys: [['session'], ['admin-bootstrap']],
                });
            });

            ws.on('error', (error: Error) => {
                logWarn('realtime.socket_error', {
                    realmId: auth.realmId,
                    userId: auth.userId,
                    error: serializeError(error),
                });
            });
        });
    });

    logInfo('realtime.server_attached', {
        path: '/api/live',
    });

    return wss;
};
