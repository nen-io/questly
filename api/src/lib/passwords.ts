import bcrypt from 'bcryptjs';

const DEFAULT_PASSWORD_HASH_ROUNDS = 12;
const MIN_PASSWORD_HASH_ROUNDS = 10;
const MAX_PASSWORD_HASH_ROUNDS = 14;

function resolvePasswordHashRounds() {
    const rawValue = process.env.PASSWORD_HASH_ROUNDS;
    const parsedValue = rawValue ? Number.parseInt(rawValue, 10) : DEFAULT_PASSWORD_HASH_ROUNDS;

    if (!Number.isFinite(parsedValue)) {
        return DEFAULT_PASSWORD_HASH_ROUNDS;
    }

    return Math.min(MAX_PASSWORD_HASH_ROUNDS, Math.max(MIN_PASSWORD_HASH_ROUNDS, parsedValue));
}

export const passwordHashRounds = resolvePasswordHashRounds();

export function hashPassword(password: string) {
    return bcrypt.hash(password, passwordHashRounds);
}

export function verifyPassword(password: string, passwordHash: string) {
    return bcrypt.compare(password, passwordHash);
}
