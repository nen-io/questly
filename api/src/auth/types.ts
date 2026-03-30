export interface TokenPayload {
    sub: string;
    realmId: number;
    role: 'admin' | 'player';
    username: string;
    tokenVersion: number;
    sessionId: string;
}

export interface SessionUser {
    id: number;
    realmId: number;
    sessionId: string;
    username: string;
    displayName: string;
    avatarStorageKey: string | null;
    email: string | null;
    emailVerifiedAt: Date | null;
    role: 'admin' | 'player';
    mustChangePassword: boolean;
    emailNotificationsEnabled: boolean;
    inAppNotificationsEnabled: boolean;
    tokenVersion: number;
}
