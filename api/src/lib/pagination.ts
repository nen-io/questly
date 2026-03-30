import type { Request } from 'express';
import { HttpError } from './http';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const parsePositiveInt = (
    raw: unknown,
    field: string,
    fallback: number,
    max: number,
) => {
    if (raw === undefined || raw === null || raw === '') {
        return fallback;
    }

    if (Array.isArray(raw)) {
        throw new HttpError(400, `${field} must be a single number`);
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 1) {
        throw new HttpError(400, `${field} must be a positive number`);
    }

    return clamp(Math.trunc(parsed), 1, max);
};

export const parsePagination = (req: Pick<Request, 'query'>, defaults?: { page?: number; pageSize?: number; maxPageSize?: number }) => {
    const maxPageSize = defaults?.maxPageSize || 50;
    const page = parsePositiveInt(req.query.page, 'page', defaults?.page || 1, 9999);
    const pageSize = parsePositiveInt(req.query.pageSize, 'pageSize', defaults?.pageSize || 12, maxPageSize);

    return {
        page,
        pageSize,
        offset: (page - 1) * pageSize,
    };
};

export const buildPaginatedResult = <T>(items: T[], total: number, page: number, pageSize: number) => ({
    items,
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    hasMore: page * pageSize < total,
});
