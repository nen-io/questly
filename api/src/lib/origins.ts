const normalizeOrigins = (value: string | undefined) => (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => new URL(item).origin);

const fallbackOrigins = ['http://localhost:5173'];

export const allowAnyOrigin = process.env.ALLOW_ANY_ORIGIN === 'true';

export const allowedOrigins = (() => {
    if (allowAnyOrigin) {
        return [];
    }

    const configuredOrigins = normalizeOrigins(process.env.FRONTEND_URL);
    return configuredOrigins.length > 0 ? configuredOrigins : fallbackOrigins;
})();

export const isOriginAllowed = (origin: string | null | undefined) => {
    if (allowAnyOrigin) {
        return true;
    }

    if (!origin) {
        return true;
    }

    return allowedOrigins.includes(origin);
};
