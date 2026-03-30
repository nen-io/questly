import type { Router } from 'express';

import {
    assertRealmCategories,
    assertRealmUsers,
    createNotifications,
    createPlatformEvent,
    createTaskPayloadSchema,
    db,
    handleRouteError,
    parseWithSchema,
    publishInvalidate,
    replaceTaskRelations,
    resolvePlayerRecipients,
    slugify,
    tasks,
    withRuleKind,
} from './shared';

export const registerPostTaskRoute = (router: Router) => {
    router.post('/tasks', async (req, res) => {
        try {
            const payload = parseWithSchema(createTaskPayloadSchema, req.body);
            const rewardRules = withRuleKind(payload.rewardRules, 'reward');
            const penaltyRules = withRuleKind(payload.penaltyRules, 'penalty');
            await assertRealmUsers(req.auth!.realmId, payload.assignmentMode === 'selected_players' ? payload.userIds : []);
            await assertRealmCategories(req.auth!.realmId, [...rewardRules, ...penaltyRules]);

            const [created] = await db.insert(tasks).values({
                realmId: req.auth!.realmId,
                title: payload.title,
                slug: slugify(payload.slug || payload.title),
                description: payload.description ?? null,
                color: payload.color ?? null,
                icon: payload.icon ?? null,
                recurrence: payload.recurrence,
                assignmentMode: payload.assignmentMode,
                expiresInHours: payload.expiresInHours,
                isActive: payload.isActive ?? true,
                createdByUserId: req.auth!.id,
                updatedAt: new Date(),
            }).returning();

            await replaceTaskRelations(created.id, payload.assignmentMode, payload.userIds, rewardRules, penaltyRules);
            const recipientUserIds = await resolvePlayerRecipients(req.auth!.realmId, payload.assignmentMode, payload.userIds);
            await createNotifications({
                realmId: req.auth!.realmId,
                recipientUserIds,
                actorUserId: req.auth!.id,
                type: 'task_created',
                title: 'A new quest is available',
                body: `${created.title} was added to the platform.`,
                link: '/app/quests',
                metadata: { taskId: created.id },
                emailSubject: 'New quest added',
                emailIntro: 'A new quest was added to your shared platform.',
            });
            await createPlatformEvent({
                realmId: req.auth!.realmId,
                type: 'quest_created',
                actorUserId: req.auth!.id,
                taskId: created.id,
                summary: `${req.auth!.displayName} added a new quest: ${created.title}.`,
            });
            publishInvalidate({
                realmId: req.auth!.realmId,
                reason: 'admin.quest_created',
                queryKeys: [['tasks'], ['notifications'], ['activity-feed'], ['session'], ['admin-bootstrap']],
            });
            res.status(201).json(created);
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'admin.quests.create.failed',
                fallbackMessage: 'Unable to create quest',
            });
        }
    });
};
