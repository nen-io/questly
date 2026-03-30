import type { Router } from 'express';

import {
    and,
    assertRealmCategories,
    assertRealmUsers,
    createNotifications,
    createPlatformEvent,
    createRewardPayloadSchema,
    db,
    eq,
    handleRouteError,
    idParamSchema,
    parseWithSchema,
    publishInvalidate,
    replaceRewardRelations,
    resolvePlayerRecipients,
    rewards,
    slugify,
    withRuleKind,
} from './shared';

export const registerPatchRewardRoute = (router: Router) => {
    router.patch('/rewards/:id', async (req, res) => {
        try {
            const { id: rewardId } = parseWithSchema(idParamSchema('reward id'), req.params);
            const payload = parseWithSchema(createRewardPayloadSchema, req.body);
            const costs = withRuleKind(payload.costs, 'reward');
            await assertRealmUsers(req.auth!.realmId, payload.assignmentMode === 'selected_players' ? payload.userIds : []);
            await assertRealmCategories(req.auth!.realmId, costs);

            const [updated] = await db.update(rewards)
                .set({
                    title: payload.title,
                    slug: slugify(payload.slug || payload.title),
                    description: payload.description ?? null,
                    color: payload.color ?? null,
                    icon: payload.icon ?? null,
                    assignmentMode: payload.assignmentMode,
                    cooldownDays: payload.cooldownDays,
                    isRedeemable: payload.isRedeemable ?? true,
                    isActive: payload.isActive ?? true,
                    updatedAt: new Date(),
                })
                .where(and(eq(rewards.id, rewardId), eq(rewards.realmId, req.auth!.realmId)))
                .returning();

            if (!updated) {
                return res.status(404).json({ error: 'Reward not found' });
            }

            await replaceRewardRelations(rewardId, payload.assignmentMode, payload.userIds, costs);
            const recipientUserIds = await resolvePlayerRecipients(req.auth!.realmId, payload.assignmentMode, payload.userIds);
            await createNotifications({
                realmId: req.auth!.realmId,
                recipientUserIds,
                actorUserId: req.auth!.id,
                type: 'reward_updated',
                title: 'A reward was updated',
                body: `${updated.title} was updated in the reward catalog.`,
                link: '/app/rewards',
                metadata: { rewardId: updated.id },
                emailSubject: 'Reward updated',
                emailIntro: 'One of your rewards has new details.',
            });
            await createPlatformEvent({
                realmId: req.auth!.realmId,
                type: 'reward_updated',
                actorUserId: req.auth!.id,
                rewardId: updated.id,
                summary: `${req.auth!.displayName} updated the reward ${updated.title}.`,
            });
            publishInvalidate({
                realmId: req.auth!.realmId,
                reason: 'admin.reward_updated',
                queryKeys: [['rewards'], ['notifications'], ['activity-feed'], ['session'], ['admin-bootstrap']],
            });
            res.json(updated);
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'admin.rewards.update.failed',
                fallbackMessage: 'Unable to update reward',
                context: { rewardId: req.params.id ?? null },
            });
        }
    });
};
