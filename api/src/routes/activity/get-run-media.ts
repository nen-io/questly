import type { Router } from 'express';

import { asc, db, eq, handleRouteError, idParamSchema, loadRealmRun, parseWithSchema, signTaskRunMediaItem, taskRunMedia } from './shared';

export const registerGetRunMediaRoute = (router: Router) => {
    router.get('/runs/:id/media', async (req, res) => {
        try {
            const { id: runId } = parseWithSchema(idParamSchema('run id'), req.params);
            await loadRealmRun(req.auth!.realmId, runId);

            const media = await db.select().from(taskRunMedia)
                .where(eq(taskRunMedia.taskRunId, runId))
                .orderBy(asc(taskRunMedia.sortOrder));

            res.json(await Promise.all(media.map((item) => signTaskRunMediaItem(item))));
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'activity.runs.media.failed',
                fallbackMessage: 'Unable to load win media',
                context: { runId: req.params.id ?? null },
            });
        }
    });
};
