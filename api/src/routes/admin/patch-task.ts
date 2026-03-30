import type { Router } from 'express';

import {
    and,
    assertRealmCategories,
    assertRealmUsers,
    createNotifications,
    createPlatformEvent,
    createTaskPayloadSchema,
    db,
    eq,
    handleRouteError,
    idParamSchema,
    parseWithSchema,
    publishInvalidate,
    replaceTaskRelations,
    resolvePlayerRecipients,
    slugify,
    tasks,
    withRuleKind,
} from './shared';

export const registerPatchTaskRoute = (router: Router) => {
    router.patch('/tasks/:id', async (req, res) => {
        try {
            const { id: taskId } = parseWithSchema(idParamSchema('quest id'), req.params);
            const payload = parseWithSchema(createTaskPayloadSchema, req.body);
            const rewardRules = withRuleKind(payload.rewardRules, 'reward');
            const penaltyRules = withRuleKind(payload.penaltyRules, 'penalty');
            await assertRealmUsers(req.auth!.realmId, payload.assignmentMode === 'selected_players' ? payload.userIds : []);
            await assertRealmCategories(req.auth!.realmId, [...rewardRules, ...penaltyRules]);

            const [updated] = await db.update(tasks)
                .set({
                    title: payload.title,
                    slug: slugify(payload.slug || payload.title),
                    description: payload.description ?? null,
                    color: payload.color ?? null,
                    icon: payload.icon ?? null,
                    recurrence: payload.recurrence,
                    assignmentMode: payload.assignmentMode,
                    expiresInHours: payload.expiresInHours,
                    isActive: payload.isActive ?? true,
                    updatedAt: new Date(),
                })
                .where(and(eq(tasks.id, taskId), eq(tasks.realmId, req.auth!.realmId)))
                .returning();

            if (!updated) {
                return res.status(404).json({ error: 'Quest not found' });
            }

            await replaceTaskRelations(taskId, payload.assignmentMode, payload.userIds, rewardRules, penaltyRules);
            const recipientUserIds = await resolvePlayerRecipients(req.auth!.realmId, payload.assignmentMode, payload.userIds);
            await createNotifications({
                realmId: req.auth!.realmId,
                recipientUserIds,
                actorUserId: req.auth!.id,
                type: 'task_updated',
                title: 'A quest was updated',
                body: `${updated.title} was updated in the platform.`,
                link: '/app/quests',
                metadata: { taskId: updated.id },
                emailSubject: 'Quest updated',
                emailIntro: 'One of your quests has new details.',
            });
            await createPlatformEvent({
                realmId: req.auth!.realmId,
                type: 'quest_updated',
                actorUserId: req.auth!.id,
                taskId: updated.id,
                summary: `${req.auth!.displayName} updated the quest ${updated.title}.`,
            });
            publishInvalidate({
                realmId: req.auth!.realmId,
                reason: 'admin.quest_updated',
                queryKeys: [['tasks'], ['notifications'], ['activity-feed'], ['session'], ['admin-bootstrap']],
            });
            res.json(updated);
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'admin.quests.update.failed',
                fallbackMessage: 'Unable to update quest',
                context: { taskId: req.params.id ?? null },
            });
        }
    });
};
