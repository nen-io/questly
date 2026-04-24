import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { contentBlocks, realmSettings, themePresets } from '../db/schema';
import { resolveFontPreset } from '../../../shared/font-presets';
import { buildContentMediaAssetRef, signContentMediaSource } from './contentMedia';
import { forceHttpsMediaUrl } from './mediaUrl';
import { defaultContent } from './theme-presets';

export const listContentBlocks = async (realmId: number) => {
    const rows = await db.select().from(contentBlocks).where(eq(contentBlocks.realmId, realmId));

    const map = rows.reduce<Record<string, string>>((accumulator, row) => {
        accumulator[row.key] = row.value;
        return accumulator;
    }, {});

    const loginBackgroundImageSource = map.login_background_image_url || defaultContent.loginBackgroundImageSource;
    const loginBackgroundVideoSource = map.login_background_video_url || defaultContent.loginBackgroundVideoSource;
    const [loginBackgroundImageUrl, loginBackgroundVideoUrl] = await Promise.all([
        signContentMediaSource(loginBackgroundImageSource),
        signContentMediaSource(loginBackgroundVideoSource),
    ]);

    return {
        fontPresetKey: map.font_preset_key || defaultContent.fontPresetKey,
        loginTitle: map.login_title || defaultContent.loginTitle,
        loginMessage: map.login_message || defaultContent.loginMessage,
        // Normalize stored external branding media so existing realms move onto
        // HTTPS without needing a manual database cleanup.
        loginImageUrl: forceHttpsMediaUrl(map.login_image_url || defaultContent.loginImageUrl),
        loginBackgroundImageUrl,
        loginBackgroundImageSource,
        loginBackgroundImageAsset: buildContentMediaAssetRef('login_background_image', loginBackgroundImageSource),
        loginBackgroundVideoUrl,
        loginBackgroundVideoSource,
        loginBackgroundVideoAsset: buildContentMediaAssetRef('login_background_video', loginBackgroundVideoSource),
        dashboardTitle: map.dashboard_title || defaultContent.dashboardTitle,
        dashboardMessage: map.dashboard_message || defaultContent.dashboardMessage,
        onboardingIntroEyebrow: map.onboarding_intro_eyebrow || defaultContent.onboardingIntroEyebrow,
        onboardingIntroTitle: map.onboarding_intro_title || defaultContent.onboardingIntroTitle,
        onboardingIntroMessage: map.onboarding_intro_message || defaultContent.onboardingIntroMessage,
        onboardingLaunchTitle: map.onboarding_launch_title || defaultContent.onboardingLaunchTitle,
        onboardingLaunchMessage: map.onboarding_launch_message || defaultContent.onboardingLaunchMessage,
    };
};

export const getRealmPresentation = async (realmId: number) => {
    const [settings] = await db.select().from(realmSettings).where(eq(realmSettings.realmId, realmId)).limit(1);
    if (!settings) {
        throw new Error('Realm settings not found');
    }

    const [theme] = await db.select().from(themePresets).where(eq(themePresets.id, settings.themePresetId)).limit(1);
    if (!theme) {
        throw new Error('Theme preset not found');
    }

    const content = await listContentBlocks(realmId);

    const fontPreset = resolveFontPreset(content.fontPresetKey);

    return {
        settings,
        theme: {
            id: theme.id,
            key: theme.key,
            name: theme.name,
            audience: theme.audience,
            description: theme.description,
            tokens: {
                ...(theme.tokens as Record<string, string>),
                fontSans: fontPreset.fontSans,
                fontDisplay: fontPreset.fontDisplay,
            },
        },
        content,
    };
};
