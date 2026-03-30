import { eq } from 'drizzle-orm';
import { closeDbConnection, db } from './client';
import { contentBlocks, realmOnboardingState, realmSettings, realms, themePresets, users } from './schema';
import { hashPassword } from '../lib/passwords';
import { defaultContent, defaultThemeKey, themePresetSeeds } from '../lib/theme-presets';

const realmSlug = process.env.REALM_SLUG || 'questly-home';
const realmName = process.env.REALM_NAME || 'Questly';
const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminDisplayName = process.env.ADMIN_DISPLAY_NAME || 'Game Admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'questly-admin';

const run = async () => {
    for (const preset of themePresetSeeds) {
        await db.insert(themePresets).values(preset).onConflictDoNothing();
    }

    let [realm] = await db.select().from(realms).where(eq(realms.slug, realmSlug)).limit(1);
    if (!realm) {
        [realm] = await db.insert(realms).values({
            slug: realmSlug,
            name: realmName,
        }).returning();
    }

    const [defaultTheme] = await db.select().from(themePresets).where(eq(themePresets.key, defaultThemeKey)).limit(1);
    if (!defaultTheme) {
        throw new Error('Default theme preset is missing');
    }

    const [settings] = await db.select().from(realmSettings).where(eq(realmSettings.realmId, realm.id)).limit(1);
    if (!settings) {
        await db.insert(realmSettings).values({
            realmId: realm.id,
            themePresetId: defaultTheme.id,
            platformName: realmName,
            onboardingCompleted: false,
        });
    }

    const contentSeed = [
        { key: 'font_preset_key', value: defaultContent.fontPresetKey, description: 'Optional font preset applied across the platform.' },
        { key: 'login_title', value: defaultContent.loginTitle, description: 'Hero heading on the login page.' },
        { key: 'login_message', value: defaultContent.loginMessage, description: 'Supporting copy on the login page.' },
        { key: 'login_background_image_url', value: defaultContent.loginBackgroundImageSource ?? '', description: 'Optional full-page background image on the login page.' },
        { key: 'login_background_video_url', value: defaultContent.loginBackgroundVideoSource ?? '', description: 'Optional full-page background video on the login page.' },
        { key: 'dashboard_title', value: defaultContent.dashboardTitle, description: 'Main dashboard heading.' },
        { key: 'dashboard_message', value: defaultContent.dashboardMessage, description: 'Main dashboard subheading.' },
        { key: 'onboarding_intro_eyebrow', value: defaultContent.onboardingIntroEyebrow, description: 'Small retro eyebrow on the onboarding landing.' },
        { key: 'onboarding_intro_title', value: defaultContent.onboardingIntroTitle, description: 'Main onboarding landing headline.' },
        { key: 'onboarding_intro_message', value: defaultContent.onboardingIntroMessage, description: 'Supporting onboarding landing copy.' },
        { key: 'onboarding_launch_title', value: defaultContent.onboardingLaunchTitle, description: 'Review and launch headline.' },
        { key: 'onboarding_launch_message', value: defaultContent.onboardingLaunchMessage, description: 'Review and launch supporting copy.' },
    ];

    for (const item of contentSeed) {
        await db.insert(contentBlocks).values({
            realmId: realm.id,
            key: item.key,
            value: item.value,
            description: item.description,
        }).onConflictDoNothing();
    }

    let [admin] = await db.select().from(users).where(eq(users.username, adminUsername)).limit(1);
    if (!admin) {
        const passwordHash = await hashPassword(adminPassword);
        [admin] = await db.insert(users).values({
            realmId: realm.id,
            username: adminUsername,
            displayName: adminDisplayName,
            passwordHash,
            role: 'admin',
            status: 'active',
            mustChangePassword: false,
        }).returning();
    }

    await db.insert(realmOnboardingState).values({
        realmId: realm.id,
        status: 'not_started',
        currentStep: 'identity',
        completedSteps: [],
        lastVisitedStep: 'identity',
    }).onConflictDoNothing();

    console.log(`Realm: ${realm.name}`);
    console.log(`Admin username: ${admin.username}`);
};

run()
    .then(async () => {
        await closeDbConnection();
    })
    .catch(async (error) => {
        console.error('Seed failed');
        console.error(error);
        await closeDbConnection();
        process.exit(1);
    });
