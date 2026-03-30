import { and, eq, inArray } from 'drizzle-orm';
import { closeDbConnection, db } from './client';
import {
    contentBlocks,
    playerPointBalances,
    pointCategories,
    realmOnboardingState,
    realmSettings,
    realms,
    rewardCosts,
    rewards,
    taskAssignments,
    taskPointRules,
    taskRuns,
    tasks,
    themePresets,
    users,
} from './schema';
import { hashPassword } from '../lib/passwords';
import { defaultContent, themePresetSeeds } from '../lib/theme-presets';
import { slugify } from '../lib/slugs';
import { ensureBalancesForUsers } from '../lib/points';

const realmSlug = process.env.REALM_SLUG || 'questly-home';
const realmName = process.env.REALM_NAME || 'Questly';
const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminDisplayName = process.env.ADMIN_DISPLAY_NAME || 'Game Admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'questly-admin';
const playerPassword = process.env.SKIP_ONBOARDING_PLAYER_PASSWORD || 'questly-player';
const couplesThemeKey = process.env.SKIP_ONBOARDING_THEME_KEY || 'couples-glow';

const lovingContent = {
    fontPresetKey: 'pixel-arcade',
    loginTitle: 'Two hearts. One cabinet.',
    loginMessage: 'Keep score on the little rituals, sweet wins, and daily acts of love that make your home feel like your own private arcade.',
    loginImageUrl: defaultContent.loginImageUrl,
    loginBackgroundImageUrl: defaultContent.loginBackgroundImageUrl,
    loginBackgroundImageSource: defaultContent.loginBackgroundImageSource,
    loginBackgroundImageAsset: defaultContent.loginBackgroundImageAsset,
    loginBackgroundVideoUrl: defaultContent.loginBackgroundVideoUrl,
    loginBackgroundVideoSource: defaultContent.loginBackgroundVideoSource,
    loginBackgroundVideoAsset: defaultContent.loginBackgroundVideoAsset,
    dashboardTitle: 'Welcome back, lovebirds.',
    dashboardMessage: 'Check the board, cheer each other on, and turn everyday kindness into a running co-op high score.',
    onboardingIntroEyebrow: defaultContent.onboardingIntroEyebrow,
    onboardingIntroTitle: defaultContent.onboardingIntroTitle,
    onboardingIntroMessage: defaultContent.onboardingIntroMessage,
    onboardingLaunchTitle: defaultContent.onboardingLaunchTitle,
    onboardingLaunchMessage: defaultContent.onboardingLaunchMessage,
};

const categorySeeds = [
    {
        name: 'Love',
        description: 'The warm fuzzy score for romance, cuddles, and thoughtful little gestures.',
        color: '#ff6fae',
        icon: '💗',
        balances: { val: 58, aj: 44 },
    },
    {
        name: 'Sexy',
        description: 'Flirty energy, date-night confidence, and anything that raises the temperature.',
        color: '#ff8a5b',
        icon: '🌮',
        balances: { val: 21, aj: 13 },
    },

];

const taskSeeds = [
    {
        title: 'Good morning kiss combo',
        description: 'Start the day with a proper kiss, a cuddle, and one nice thing said out loud.',
        color: '#ff6fae',
        icon: '💋',
        recurrence: 'daily',
        expiresInHours: 12,
        rewardRules: [
            { categoryName: 'Love', amount: 8 },
            { categoryName: 'Sexy', amount: 2 },
        ],
        penaltyRules: [],
    },
    {
        title: 'Tidy up my side quest',
        description: 'Clean up your own chaos before it mutates into a boss fight.',
        color: '#7b6dff',
        icon: '🧺',
        recurrence: 'daily',
        expiresInHours: 24,
        rewardRules: [
            { categoryName: 'Sexy', amount: 7 },
            { categoryName: 'Love', amount: 2 },
        ],
        penaltyRules: [
            { categoryName: 'Sexy', amount: 2 },
        ],
    },
    {
        title: 'Plan the next little date',
        description: 'Book, plan, or set up a tiny date moment so the week has something sweet on the map.',
        color: '#ff8a5b',
        icon: '🗓️',
        recurrence: 'weekly',
        expiresInHours: 72,
        rewardRules: [
            { categoryName: 'Love', amount: 10 },
            { categoryName: 'Sexy', amount: 5 },
        ],
        penaltyRules: [],
    },
];

const rewardSeeds = [
    {
        title: 'Birria taco date',
        description: 'Winner gets a proper taco run with full attention and zero phone scrolling.',
        color: '#ff8a5b',
        icon: '🌮',
        cooldownDays: 3,
        costs: [
            { categoryName: 'Love', amount: 20 },
            { categoryName: 'Sexy', amount: 8 },
        ],
    },
    {
        title: 'Movie night pick priority',
        description: 'Pick the film, claim the blanket spot, and choose the snacks without debate.',
        color: '#7b6dff',
        icon: '🎬',
        cooldownDays: 2,
        costs: [
            { categoryName: 'Sexy', amount: 12 },
            { categoryName: 'Love', amount: 6 },
        ],
    },
    {
        title: 'Golden cuddle voucher',
        description: 'Redeem for uninterrupted cuddle time and a full no-errands evening.',
        color: '#ff6fae',
        icon: '🧸',
        cooldownDays: 1,
        costs: [
            { categoryName: 'Love', amount: 16 },
        ],
    },
];

const upsertContentBlock = async (realmId: number, key: string, value: string, description: string) => {
    const [existing] = await db.select().from(contentBlocks).where(and(
        eq(contentBlocks.realmId, realmId),
        eq(contentBlocks.key, key),
    )).limit(1);

    if (!existing) {
        await db.insert(contentBlocks).values({
            realmId,
            key,
            value,
            description,
        });
        return;
    }

    await db.update(contentBlocks)
        .set({
            value,
            description,
            updatedAt: new Date(),
        })
        .where(eq(contentBlocks.id, existing.id));
};

const ensureThemePresets = async () => {
    for (const preset of themePresetSeeds) {
        await db.insert(themePresets).values(preset).onConflictDoNothing();
    }

    const [theme] = await db.select().from(themePresets).where(eq(themePresets.key, couplesThemeKey)).limit(1);
    if (!theme) {
        throw new Error(`Theme preset "${couplesThemeKey}" is missing`);
    }

    return theme;
};

const ensureRealm = async (themePresetId: number) => {
    let [realm] = await db.select().from(realms).where(eq(realms.slug, realmSlug)).limit(1);
    if (!realm) {
        [realm] = await db.insert(realms).values({
            slug: realmSlug,
            name: realmName,
        }).returning();
    }

    const [settings] = await db.select().from(realmSettings).where(eq(realmSettings.realmId, realm.id)).limit(1);
    if (!settings) {
        await db.insert(realmSettings).values({
            realmId: realm.id,
            themePresetId,
            platformName: realmName,
            onboardingCompleted: true,
        });
    } else {
        await db.update(realmSettings)
            .set({
                themePresetId,
                platformName: realmName,
                onboardingCompleted: true,
                updatedAt: new Date(),
            })
            .where(eq(realmSettings.id, settings.id));
    }

    await db.insert(realmOnboardingState).values({
        realmId: realm.id,
        status: 'launched',
        currentStep: 'launch',
        completedSteps: ['identity', 'player', 'attribute', 'quest', 'reward', 'launch'],
        lastVisitedStep: 'launch',
        launchedAt: new Date(),
        updatedAt: new Date(),
    }).onConflictDoNothing();

    await db.update(realmOnboardingState)
        .set({
            status: 'launched',
            currentStep: 'launch',
            completedSteps: ['identity', 'player', 'attribute', 'quest', 'reward', 'launch'],
            lastVisitedStep: 'launch',
            launchedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(realmOnboardingState.realmId, realm.id));

    return realm;
};

const ensureUsers = async (realmId: number) => {
    const adminPasswordHash = await hashPassword(adminPassword);
    const playerPasswordHash = await hashPassword(playerPassword);

    const seedUsers = [
        {
            username: adminUsername,
            displayName: adminDisplayName,
            passwordHash: adminPasswordHash,
            role: 'admin' as const,
        },
        {
            username: 'val',
            displayName: 'Val',
            passwordHash: playerPasswordHash,
            role: 'player' as const,
        },
        {
            username: 'aj',
            displayName: 'Aj',
            passwordHash: playerPasswordHash,
            role: 'player' as const,
        },
    ];

    const userMap = new Map<string, typeof users.$inferSelect>();

    for (const seedUser of seedUsers) {
        const [existing] = await db.select().from(users).where(and(
            eq(users.realmId, realmId),
            eq(users.username, seedUser.username),
        )).limit(1);

        if (!existing) {
            const [created] = await db.insert(users).values({
                realmId,
                username: seedUser.username,
                displayName: seedUser.displayName,
                passwordHash: seedUser.passwordHash,
                role: seedUser.role,
                status: 'active',
                mustChangePassword: false,
            }).returning();
            userMap.set(seedUser.username, created);
            continue;
        }

        const [updated] = await db.update(users)
            .set({
                displayName: seedUser.displayName,
                passwordHash: seedUser.passwordHash,
                role: seedUser.role,
                status: 'active',
                mustChangePassword: false,
                updatedAt: new Date(),
            })
            .where(eq(users.id, existing.id))
            .returning();
        userMap.set(seedUser.username, updated);
    }

    return {
        admin: userMap.get(adminUsername)!,
        val: userMap.get('val')!,
        aj: userMap.get('aj')!,
    };
};

const ensureCategories = async (realmId: number) => {
    const categories = new Map<string, typeof pointCategories.$inferSelect>();

    for (let index = 0; index < categorySeeds.length; index += 1) {
        const seed = categorySeeds[index];
        const slug = slugify(seed.name);
        const [existing] = await db.select().from(pointCategories).where(and(
            eq(pointCategories.realmId, realmId),
            eq(pointCategories.slug, slug),
        )).limit(1);

        if (!existing) {
            const [created] = await db.insert(pointCategories).values({
                realmId,
                slug,
                name: seed.name,
                description: seed.description,
                color: seed.color,
                icon: seed.icon,
                sortOrder: index,
                isActive: true,
            }).returning();
            categories.set(seed.name, created);
            continue;
        }

        const [updated] = await db.update(pointCategories)
            .set({
                name: seed.name,
                description: seed.description,
                color: seed.color,
                icon: seed.icon,
                sortOrder: index,
                isActive: true,
                updatedAt: new Date(),
            })
            .where(eq(pointCategories.id, existing.id))
            .returning();
        categories.set(seed.name, updated);
    }

    return categories;
};

const ensureTaskRules = async (
    taskId: number,
    kind: 'reward' | 'penalty',
    rules: Array<{ categoryName: string; amount: number }>,
    categories: Map<string, typeof pointCategories.$inferSelect>,
) => {
    const categoryIds = rules
        .map((rule) => categories.get(rule.categoryName)?.id)
        .filter((value): value is number => typeof value === 'number');

    if (categoryIds.length > 0) {
        await db.delete(taskPointRules).where(and(
            eq(taskPointRules.taskId, taskId),
            eq(taskPointRules.kind, kind),
            inArray(taskPointRules.categoryId, categoryIds),
        ));
    }

    if (rules.length === 0) {
        return;
    }

    await db.insert(taskPointRules).values(rules.map((rule) => {
        const category = categories.get(rule.categoryName);
        if (!category) {
            throw new Error(`Missing category ${rule.categoryName}`);
        }

        return {
            taskId,
            categoryId: category.id,
            kind,
            amount: rule.amount,
        };
    }));
};

const ensureTasks = async (
    realmId: number,
    adminUserId: number,
    categories: Map<string, typeof pointCategories.$inferSelect>,
) => {
    const tasksByTitle = new Map<string, typeof tasks.$inferSelect>();

    for (const seed of taskSeeds) {
        const slug = slugify(seed.title);
        const [existing] = await db.select().from(tasks).where(and(
            eq(tasks.realmId, realmId),
            eq(tasks.slug, slug),
        )).limit(1);

        if (!existing) {
            const [created] = await db.insert(tasks).values({
                realmId,
                title: seed.title,
                slug,
                description: seed.description,
                color: seed.color,
                icon: seed.icon,
                recurrence: seed.recurrence,
                assignmentMode: 'all_players',
                expiresInHours: seed.expiresInHours,
                isActive: true,
                createdByUserId: adminUserId,
            }).returning();
            tasksByTitle.set(seed.title, created);
        } else {
            const [updated] = await db.update(tasks)
                .set({
                    title: seed.title,
                    description: seed.description,
                    color: seed.color,
                    icon: seed.icon,
                    recurrence: seed.recurrence,
                    assignmentMode: 'all_players',
                    expiresInHours: seed.expiresInHours,
                    isActive: true,
                    createdByUserId: adminUserId,
                    updatedAt: new Date(),
                })
                .where(eq(tasks.id, existing.id))
                .returning();
            tasksByTitle.set(seed.title, updated);
        }

        const task = tasksByTitle.get(seed.title)!;
        await db.delete(taskAssignments).where(eq(taskAssignments.taskId, task.id));
        await ensureTaskRules(task.id, 'reward', seed.rewardRules, categories);
        await ensureTaskRules(task.id, 'penalty', seed.penaltyRules, categories);
    }

    return tasksByTitle;
};

const ensureRewardCosts = async (
    rewardId: number,
    costs: Array<{ categoryName: string; amount: number }>,
    categories: Map<string, typeof pointCategories.$inferSelect>,
) => {
    const categoryIds = costs
        .map((cost) => categories.get(cost.categoryName)?.id)
        .filter((value): value is number => typeof value === 'number');

    if (categoryIds.length > 0) {
        await db.delete(rewardCosts).where(and(
            eq(rewardCosts.rewardId, rewardId),
            inArray(rewardCosts.categoryId, categoryIds),
        ));
    }

    if (costs.length === 0) {
        return;
    }

    await db.insert(rewardCosts).values(costs.map((cost) => {
        const category = categories.get(cost.categoryName);
        if (!category) {
            throw new Error(`Missing category ${cost.categoryName}`);
        }

        return {
            rewardId,
            categoryId: category.id,
            amount: cost.amount,
        };
    }));
};

const ensureRewards = async (
    realmId: number,
    adminUserId: number,
    categories: Map<string, typeof pointCategories.$inferSelect>,
) => {
    const rewardsByTitle = new Map<string, typeof rewards.$inferSelect>();

    for (const seed of rewardSeeds) {
        const slug = slugify(seed.title);
        const [existing] = await db.select().from(rewards).where(and(
            eq(rewards.realmId, realmId),
            eq(rewards.slug, slug),
        )).limit(1);

        if (!existing) {
            const [created] = await db.insert(rewards).values({
                realmId,
                title: seed.title,
                slug,
                description: seed.description,
                color: seed.color,
                icon: seed.icon,
                assignmentMode: 'all_players',
                cooldownDays: seed.cooldownDays,
                isRedeemable: true,
                isActive: true,
                createdByUserId: adminUserId,
            }).returning();
            rewardsByTitle.set(seed.title, created);
        } else {
            const [updated] = await db.update(rewards)
                .set({
                    title: seed.title,
                    description: seed.description,
                    color: seed.color,
                    icon: seed.icon,
                    assignmentMode: 'all_players',
                    cooldownDays: seed.cooldownDays,
                    isRedeemable: true,
                    isActive: true,
                    createdByUserId: adminUserId,
                    updatedAt: new Date(),
                })
                .where(eq(rewards.id, existing.id))
                .returning();
            rewardsByTitle.set(seed.title, updated);
        }

        await ensureRewardCosts(rewardsByTitle.get(seed.title)!.id, seed.costs, categories);
    }

    return rewardsByTitle;
};

const seedBalances = async (
    usersByKey: { val: typeof users.$inferSelect; aj: typeof users.$inferSelect },
    categories: Map<string, typeof pointCategories.$inferSelect>,
) => {
    await ensureBalancesForUsers(usersByKey.val.realmId, [usersByKey.val.id, usersByKey.aj.id]);

    for (const seed of categorySeeds) {
        const category = categories.get(seed.name);
        if (!category) {
            continue;
        }

        const targets = [
            { userId: usersByKey.val.id, balance: seed.balances.val },
            { userId: usersByKey.aj.id, balance: seed.balances.aj },
        ];

        for (const target of targets) {
            const [existing] = await db.select().from(playerPointBalances).where(and(
                eq(playerPointBalances.userId, target.userId),
                eq(playerPointBalances.categoryId, category.id),
            )).limit(1);

            if (!existing) {
                await db.insert(playerPointBalances).values({
                    userId: target.userId,
                    categoryId: category.id,
                    balance: target.balance,
                });
                continue;
            }

            await db.update(playerPointBalances)
                .set({
                    balance: target.balance,
                    updatedAt: new Date(),
                })
                .where(eq(playerPointBalances.id, existing.id));
        }
    }
};

const seedSampleRuns = async (
    valUser: typeof users.$inferSelect,
    taskRows: Map<string, typeof tasks.$inferSelect>,
    categories: Map<string, typeof pointCategories.$inferSelect>,
) => {
    const sampleTask = taskRows.get('Good morning kiss combo');
    if (!sampleTask) {
        return;
    }

    const [existingCompleted] = await db.select().from(taskRuns).where(and(
        eq(taskRuns.taskId, sampleTask.id),
        eq(taskRuns.userId, valUser.id),
        eq(taskRuns.status, 'completed'),
    )).limit(1);

    if (existingCompleted) {
        return;
    }

    const loveCategory = categories.get('Love');
    const sexyCategory = categories.get('Sexy');
    await db.insert(taskRuns).values({
        taskId: sampleTask.id,
        userId: valUser.id,
        status: 'completed',
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        resolvedAt: new Date(Date.now() - 90 * 60 * 1000),
        notes: 'Soft launch date-night points.',
        pointSnapshot: [
            loveCategory ? {
                categoryId: loveCategory.id,
                slug: loveCategory.slug,
                name: loveCategory.name,
                color: loveCategory.color,
                icon: loveCategory.icon,
                amount: 8,
            } : null,
            sexyCategory ? {
                categoryId: sexyCategory.id,
                slug: sexyCategory.slug,
                name: sexyCategory.name,
                color: sexyCategory.color,
                icon: sexyCategory.icon,
                amount: 2,
            } : null,
        ].filter(Boolean),
    });
};

const seedContent = async (realmId: number) => {
    const blocks = [
        { key: 'font_preset_key', value: lovingContent.fontPresetKey, description: 'Optional font preset applied across the platform.' },
        { key: 'login_title', value: lovingContent.loginTitle, description: 'Hero heading on the login page.' },
        { key: 'login_message', value: lovingContent.loginMessage, description: 'Supporting copy on the login page.' },
        { key: 'login_image_url', value: lovingContent.loginImageUrl ?? '', description: 'Large foreground sign-in image.' },
        { key: 'login_background_image_url', value: lovingContent.loginBackgroundImageSource ?? '', description: 'Optional full-page background image on the login page.' },
        { key: 'login_background_video_url', value: lovingContent.loginBackgroundVideoSource ?? '', description: 'Optional full-page background video on the login page.' },
        { key: 'dashboard_title', value: lovingContent.dashboardTitle, description: 'Main dashboard heading.' },
        { key: 'dashboard_message', value: lovingContent.dashboardMessage, description: 'Main dashboard subheading.' },
        { key: 'onboarding_intro_eyebrow', value: lovingContent.onboardingIntroEyebrow, description: 'Small retro eyebrow on the onboarding landing.' },
        { key: 'onboarding_intro_title', value: lovingContent.onboardingIntroTitle, description: 'Main onboarding landing headline.' },
        { key: 'onboarding_intro_message', value: lovingContent.onboardingIntroMessage, description: 'Supporting onboarding landing copy.' },
        { key: 'onboarding_launch_title', value: lovingContent.onboardingLaunchTitle, description: 'Review and launch headline.' },
        { key: 'onboarding_launch_message', value: lovingContent.onboardingLaunchMessage, description: 'Review and launch supporting copy.' },
    ];

    for (const block of blocks) {
        await upsertContentBlock(realmId, block.key, block.value, block.description);
    }
};

const run = async () => {
    const theme = await ensureThemePresets();
    const realm = await ensureRealm(theme.id);
    const seededUsers = await ensureUsers(realm.id);
    const categories = await ensureCategories(realm.id);
    const taskRows = await ensureTasks(realm.id, seededUsers.admin.id, categories);
    await ensureRewards(realm.id, seededUsers.admin.id, categories);
    await seedBalances({ val: seededUsers.val, aj: seededUsers.aj }, categories);
    await seedSampleRuns(seededUsers.val, taskRows, categories);
    await seedContent(realm.id);

    console.log(`Realm ready: ${realm.name}`);
    console.log(`Admin login: ${seededUsers.admin.username} / ${adminPassword}`);
    console.log(`Player login: val / ${playerPassword}`);
    console.log(`Player login: aj / ${playerPassword}`);
    console.log('Onboarding marked as launched.');
};

run()
    .then(async () => {
        await closeDbConnection();
    })
    .catch(async (error) => {
        console.error('Skip-onboarding seed failed');
        console.error(error);
        await closeDbConnection();
        process.exit(1);
    });
