import type { Router } from 'express';

import {
    assertRealmCategories,
    assertRealmUsers,
    createNotifications,
    createPlatformEvent,
    createRewardPayloadSchema,
    db,
    handleRouteError,
    parseWithSchema,
    publishInvalidate,
    replaceRewardRelations,
    resolvePlayerRecipients,
    rewards,
    slugify,
    withRuleKind,
} from './shared';

export const registerPostRewardRoute = (router: Router) => {
    router.post('/rewards', async (req, res) => {
        try {
            const payload = parseWithSchema(createRewardPayloadSchema, req.body);
            const costs = withRuleKind(payload.costs, 'reward');
            await assertRealmUsers(req.auth!.realmId, payload.assignmentMode === 'selected_players' ? payload.userIds : []);
            await assertRealmCategories(req.auth!.realmId, costs);

            const [created] = await db.insert(rewards).values({
                realmId: req.auth!.realmId,
                title: payload.title,
                slug: slugify(payload.slug || payload.title),
                description: payload.description ?? null,
                color: payload.color ?? null,
                icon: payload.icon ?? null,
                assignmentMode: payload.assignmentMode,
                cooldownDays: payload.cooldownDays,
                isRedeemable: payload.isRedeemable ?? true,
                isActive: payload.isActive ?? true,
                createdByUserId: req.auth!.id,
                updatedAt: new Date(),
            }).returning();

            await replaceRewardRelations(created.id, payload.assignmentMode, payload.userIds, costs);
            const recipientUserIds = await resolvePlayerRecipients(req.auth!.realmId, payload.assignmentMode, payload.userIds);
            await createNotifications({
                realmId: req.auth!.realmId,
                recipientUserIds,
                actorUserId: req.auth!.id,
                type: 'reward_created',
                title: 'A new reward is available',
                body: `${created.title} was added to the reward catalog.`,
                link: '/app/rewards',
                metadata: { rewardId: created.id },
                emailSubject: 'New reward added',
                emailIntro: 'A new reward was added to your shared platform.',
            });
            await createPlatformEvent({
                realmId: req.auth!.realmId,
                type: 'reward_created',
                actorUserId: req.auth!.id,
                rewardId: created.id,
                summary: `${req.auth!.displayName} added a new reward: ${created.title}.`,
            });
            publishInvalidate({
                realmId: req.auth!.realmId,
                reason: 'admin.reward_created',
                queryKeys: [['rewards'], ['notifications'], ['activity-feed'], ['session'], ['admin-bootstrap']],
            });
            res.status(201).json(created);
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'admin.rewards.create.failed',
                fallbackMessage: 'Unable to create reward',
            });
        }
    });
};
