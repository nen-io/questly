import type { Router } from 'express';

import {
    and,
    contentBlocks,
    db,
    eq,
    handleRouteError,
    inArray,
    loadAdminSnapshot,
    parseWithSchema,
    publishInvalidate,
    realmSettings,
    themePresets,
    updateSettingsPayloadSchema,
} from './shared';
import { deleteContentMediaSource } from '../../lib/contentMedia';

export const registerPutSettingsRoute = (router: Router) => {
    router.put('/settings', async (req, res) => {
        try {
            const payload = parseWithSchema(updateSettingsPayloadSchema, req.body);
            const [theme] = await db.select().from(themePresets).where(eq(themePresets.key, payload.themePresetKey)).limit(1);
            if (!theme) {
                return res.status(404).json({ error: 'Theme preset not found' });
            }

            const previousBackgroundRows = await db.select({
                key: contentBlocks.key,
                value: contentBlocks.value,
            }).from(contentBlocks).where(and(
                eq(contentBlocks.realmId, req.auth!.realmId),
                inArray(contentBlocks.key, ['login_background_image_url', 'login_background_video_url']),
            ));
            const previousBackgroundSources = previousBackgroundRows.reduce<Record<string, string>>((accumulator, row) => {
                accumulator[row.key] = row.value;
                return accumulator;
            }, {});

            const content = [
                { key: 'font_preset_key', value: payload.content.fontPresetKey },
                { key: 'login_title', value: payload.content.loginTitle },
                { key: 'login_message', value: payload.content.loginMessage },
                { key: 'login_image_url', value: payload.content.loginImageUrl || '' },
                { key: 'login_background_image_url', value: payload.content.loginBackgroundImageSource || '' },
                { key: 'login_background_video_url', value: payload.content.loginBackgroundVideoSource || '' },
                { key: 'dashboard_title', value: payload.content.dashboardTitle },
                { key: 'dashboard_message', value: payload.content.dashboardMessage },
                { key: 'onboarding_intro_eyebrow', value: payload.content.onboardingIntroEyebrow },
                { key: 'onboarding_intro_title', value: payload.content.onboardingIntroTitle },
                { key: 'onboarding_intro_message', value: payload.content.onboardingIntroMessage },
                { key: 'onboarding_launch_title', value: payload.content.onboardingLaunchTitle },
                { key: 'onboarding_launch_message', value: payload.content.onboardingLaunchMessage },
            ];
            const replacedBackgroundSources = [
                {
                    previous: previousBackgroundSources.login_background_image_url || null,
                    next: payload.content.loginBackgroundImageSource || null,
                },
                {
                    previous: previousBackgroundSources.login_background_video_url || null,
                    next: payload.content.loginBackgroundVideoSource || null,
                },
            ].filter((item) => item.previous && item.previous !== item.next);

            const [settings] = await db.select().from(realmSettings).where(eq(realmSettings.realmId, req.auth!.realmId)).limit(1);
            if (!settings) {
                return res.status(404).json({ error: 'Settings not found' });
            }

            await db.update(realmSettings)
                .set({
                    platformName: payload.platformName,
                    themePresetId: theme.id,
                    onboardingCompleted: payload.onboardingCompleted ?? settings.onboardingCompleted,
                    updatedAt: new Date(),
                })
                .where(eq(realmSettings.id, settings.id));

            for (const item of content) {
                const [existing] = await db.select({ id: contentBlocks.id }).from(contentBlocks).where(and(
                    eq(contentBlocks.realmId, req.auth!.realmId),
                    eq(contentBlocks.key, item.key),
                )).limit(1);

                if (existing) {
                    await db.update(contentBlocks)
                        .set({ value: item.value, updatedAt: new Date() })
                        .where(eq(contentBlocks.id, existing.id));
                } else {
                    await db.insert(contentBlocks).values({
                        realmId: req.auth!.realmId,
                        key: item.key,
                        value: item.value,
                        updatedAt: new Date(),
                    });
                }
            }

            // Only clean up replaced branding media after the content rows have
            // been updated so the saved settings never point at a deleted asset.
            await Promise.allSettled(replacedBackgroundSources.map((item) => deleteContentMediaSource(item.previous)));

            publishInvalidate({
                realmId: req.auth!.realmId,
                reason: 'admin.settings_updated',
                queryKeys: [['session'], ['public-config'], ['admin-bootstrap']],
            });
            res.json(await loadAdminSnapshot(req.auth!.realmId));
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'admin.settings.update.failed',
                fallbackMessage: 'Unable to update settings',
            });
        }
    });
};
