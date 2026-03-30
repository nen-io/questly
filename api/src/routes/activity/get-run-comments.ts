import type { Router } from 'express';

import {
    buildPaginatedResult,
    db,
    desc,
    eq,
    handleRouteError,
    idParamSchema,
    loadRealmRun,
    paginationQuerySchema,
    parsePagination,
    parseWithSchema,
    sql,
    taskRunComments,
    users,
} from './shared';
import { getAvatarPresentation } from '../../lib/avatar';

export const registerGetRunCommentsRoute = (router: Router) => {
    router.get('/runs/:id/comments', async (req, res) => {
        try {
            const { id: runId } = parseWithSchema(idParamSchema('run id'), req.params);
            parseWithSchema(paginationQuerySchema, req.query);
            await loadRealmRun(req.auth!.realmId, runId);
            const { page, pageSize, offset } = parsePagination(req, { pageSize: 20, maxPageSize: 50 });
            const [countRows, comments] = await Promise.all([
                db.select({
                    count: sql<number>`count(*)::int`,
                }).from(taskRunComments).where(eq(taskRunComments.taskRunId, runId)),
                db.select({
                    id: taskRunComments.id,
                    taskRunId: taskRunComments.taskRunId,
                    userId: taskRunComments.userId,
                    authorName: users.displayName,
                    authorAvatarStorageKey: users.avatarStorageKey,
                    body: taskRunComments.body,
                    createdAt: taskRunComments.createdAt,
                })
                    .from(taskRunComments)
                    .innerJoin(users, eq(users.id, taskRunComments.userId))
                    .where(eq(taskRunComments.taskRunId, runId))
                    .orderBy(desc(taskRunComments.createdAt))
                    .limit(pageSize)
                    .offset(offset),
            ]);
            const avatars = await Promise.all(comments.map((comment) => getAvatarPresentation(comment.userId, comment.authorAvatarStorageKey)));

            res.json(buildPaginatedResult(comments.map((comment, index) => ({
                id: comment.id,
                taskRunId: comment.taskRunId,
                userId: comment.userId,
                authorName: comment.authorName,
                authorAvatarUrl: avatars[index].avatarUrl,
                authorAvatarAsset: avatars[index].avatarAsset,
                body: comment.body,
                createdAt: comment.createdAt,
            })), countRows[0]?.count ?? 0, page, pageSize));
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'activity.runs.comments.failed',
                fallbackMessage: 'Unable to load win comments',
                context: { runId: req.params.id ?? null, page: req.query.page ?? null, pageSize: req.query.pageSize ?? null },
            });
        }
    });
};
