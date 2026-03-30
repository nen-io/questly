import { sql } from 'drizzle-orm';
import { pgTable, serial, text, timestamp, integer, boolean, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const themePresets = pgTable('theme_presets', {
    id: serial('id').primaryKey(),
    key: text('key').notNull().unique(),
    name: text('name').notNull(),
    audience: text('audience').notNull(),
    description: text('description').notNull(),
    tokens: jsonb('tokens').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const realms = pgTable('realms', {
    id: serial('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const realmSettings = pgTable('realm_settings', {
    id: serial('id').primaryKey(),
    realmId: integer('realm_id').references(() => realms.id).notNull().unique(),
    themePresetId: integer('theme_preset_id').references(() => themePresets.id).notNull(),
    platformName: text('platform_name').notNull(),
    onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const realmOnboardingState = pgTable('realm_onboarding_state', {
    id: serial('id').primaryKey(),
    realmId: integer('realm_id').references(() => realms.id).notNull().unique(),
    status: text('status').notNull().default('not_started'),
    currentStep: text('current_step').notNull().default('identity'),
    completedSteps: jsonb('completed_steps').notNull().default(sql`'[]'::jsonb`),
    lastVisitedStep: text('last_visited_step').notNull().default('identity'),
    launchedAt: timestamp('launched_at'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const contentBlocks = pgTable('content_blocks', {
    id: serial('id').primaryKey(),
    realmId: integer('realm_id').references(() => realms.id).notNull(),
    key: text('key').notNull(),
    value: text('value').notNull(),
    description: text('description'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    realmContentKeyIdx: uniqueIndex('content_blocks_realm_key_idx').on(table.realmId, table.key),
}));

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    realmId: integer('realm_id').references(() => realms.id).notNull(),
    username: text('username').notNull().unique(),
    displayName: text('display_name').notNull(),
    passwordHash: text('password_hash').notNull(),
    avatarStorageKey: text('avatar_storage_key'),
    email: text('email'),
    emailVerifiedAt: timestamp('email_verified_at'),
    role: text('role').notNull().default('player'),
    status: text('status').notNull().default('active'),
    mustChangePassword: boolean('must_change_password').notNull().default(false),
    emailNotificationsEnabled: boolean('email_notifications_enabled').notNull().default(true),
    inAppNotificationsEnabled: boolean('in_app_notifications_enabled').notNull().default(true),
    tokenVersion: integer('token_version').notNull().default(0),
    lastLoginAt: timestamp('last_login_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userSessions = pgTable('user_sessions', {
    id: serial('id').primaryKey(),
    sessionId: text('session_id').notNull().unique(),
    userId: integer('user_id').references(() => users.id).notNull(),
    realmId: integer('realm_id').references(() => realms.id).notNull(),
    tokenVersion: integer('token_version').notNull(),
    status: text('status').notNull().default('active'),
    lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    endedAt: timestamp('ended_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    userSessionIdx: uniqueIndex('user_sessions_user_session_idx').on(table.userId, table.sessionId),
}));

export const emailVerificationTokens = pgTable('email_verification_tokens', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    email: text('email').notNull(),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    consumedAt: timestamp('consumed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pointCategories = pgTable('point_categories', {
    id: serial('id').primaryKey(),
    realmId: integer('realm_id').references(() => realms.id).notNull(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    color: text('color').notNull().default('#1f2937'),
    icon: text('icon'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    realmCategorySlugIdx: uniqueIndex('point_categories_realm_slug_idx').on(table.realmId, table.slug),
}));

export const playerPointBalances = pgTable('player_point_balances', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    categoryId: integer('category_id').references(() => pointCategories.id).notNull(),
    balance: integer('balance').notNull().default(0),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    userCategoryIdx: uniqueIndex('player_point_balances_user_category_idx').on(table.userId, table.categoryId),
}));

export const tasks = pgTable('tasks', {
    id: serial('id').primaryKey(),
    realmId: integer('realm_id').references(() => realms.id).notNull(),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    color: text('color'),
    icon: text('icon'),
    recurrence: text('recurrence').notNull().default('daily'),
    assignmentMode: text('assignment_mode').notNull().default('all_players'),
    expiresInHours: integer('expires_in_hours'),
    isActive: boolean('is_active').notNull().default(true),
    createdByUserId: integer('created_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    realmTaskSlugIdx: uniqueIndex('tasks_realm_slug_idx').on(table.realmId, table.slug),
}));

export const taskAssignments = pgTable('task_assignments', {
    id: serial('id').primaryKey(),
    taskId: integer('task_id').references(() => tasks.id).notNull(),
    userId: integer('user_id').references(() => users.id).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    taskUserIdx: uniqueIndex('task_assignments_task_user_idx').on(table.taskId, table.userId),
}));

export const taskPointRules = pgTable('task_point_rules', {
    id: serial('id').primaryKey(),
    taskId: integer('task_id').references(() => tasks.id).notNull(),
    categoryId: integer('category_id').references(() => pointCategories.id).notNull(),
    kind: text('kind').notNull(),
    amount: integer('amount').notNull(),
}, (table) => ({
    taskCategoryKindIdx: uniqueIndex('task_point_rules_task_category_kind_idx').on(table.taskId, table.categoryId, table.kind),
}));

export const taskRuns = pgTable('task_runs', {
    id: serial('id').primaryKey(),
    taskId: integer('task_id').references(() => tasks.id).notNull(),
    userId: integer('user_id').references(() => users.id).notNull(),
    status: text('status').notNull().default('active'),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    dueAt: timestamp('due_at'),
    resolvedAt: timestamp('resolved_at'),
    notes: text('notes'),
    pointSnapshot: jsonb('point_snapshot'),
}, (table) => ({
    runTaskUserStatusIdx: uniqueIndex('task_runs_active_task_user_idx').on(table.taskId, table.userId, table.status, table.startedAt),
}));

export const taskRunComments = pgTable('task_run_comments', {
    id: serial('id').primaryKey(),
    taskRunId: integer('task_run_id').references(() => taskRuns.id).notNull(),
    userId: integer('user_id').references(() => users.id).notNull(),
    body: text('body').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const taskRunMedia = pgTable('task_run_media', {
    id: serial('id').primaryKey(),
    taskRunId: integer('task_run_id').references(() => taskRuns.id).notNull(),
    userId: integer('user_id').references(() => users.id).notNull(),
    mediaType: text('media_type').notNull(),
    mimeType: text('mime_type').notNull(),
    storageKey: text('storage_key').notNull().unique(),
    thumbnailStorageKey: text('thumbnail_storage_key').notNull().unique(),
    thumbnailMimeType: text('thumbnail_mime_type').notNull(),
    originalName: text('original_name'),
    sizeBytes: integer('size_bytes'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    taskRunMediaIdx: uniqueIndex('task_run_media_task_run_sort_idx').on(table.taskRunId, table.sortOrder),
}));

export const taskRunMediaJobs = pgTable('task_run_media_jobs', {
    id: serial('id').primaryKey(),
    realmId: integer('realm_id').references(() => realms.id).notNull(),
    taskRunId: integer('task_run_id').references(() => taskRuns.id).notNull(),
    userId: integer('user_id').references(() => users.id).notNull(),
    mediaType: text('media_type').notNull(),
    mimeType: text('mime_type').notNull(),
    storageKey: text('storage_key').notNull().unique(),
    originalName: text('original_name'),
    sizeBytes: integer('size_bytes'),
    sortOrder: integer('sort_order').notNull().default(0),
    status: text('status').notNull().default('pending'),
    attemptCount: integer('attempt_count').notNull().default(0),
    lastError: text('last_error'),
    nextAttemptAt: timestamp('next_attempt_at').defaultNow().notNull(),
    lockedAt: timestamp('locked_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    taskRunMediaJobsStatusIdx: index('task_run_media_jobs_status_next_attempt_idx').on(table.status, table.nextAttemptAt),
    taskRunMediaJobsTaskRunIdx: index('task_run_media_jobs_task_run_idx').on(table.taskRunId),
}));

export const rewards = pgTable('rewards', {
    id: serial('id').primaryKey(),
    realmId: integer('realm_id').references(() => realms.id).notNull(),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    color: text('color'),
    icon: text('icon'),
    assignmentMode: text('assignment_mode').notNull().default('all_players'),
    cooldownDays: integer('cooldown_days').notNull().default(0),
    isRedeemable: boolean('is_redeemable').notNull().default(true),
    isActive: boolean('is_active').notNull().default(true),
    createdByUserId: integer('created_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    realmRewardSlugIdx: uniqueIndex('rewards_realm_slug_idx').on(table.realmId, table.slug),
}));

export const rewardAssignments = pgTable('reward_assignments', {
    id: serial('id').primaryKey(),
    rewardId: integer('reward_id').references(() => rewards.id).notNull(),
    userId: integer('user_id').references(() => users.id).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    rewardUserIdx: uniqueIndex('reward_assignments_reward_user_idx').on(table.rewardId, table.userId),
}));

export const rewardCosts = pgTable('reward_costs', {
    id: serial('id').primaryKey(),
    rewardId: integer('reward_id').references(() => rewards.id).notNull(),
    categoryId: integer('category_id').references(() => pointCategories.id).notNull(),
    amount: integer('amount').notNull(),
}, (table) => ({
    rewardCategoryIdx: uniqueIndex('reward_costs_reward_category_idx').on(table.rewardId, table.categoryId),
}));

export const rewardPurchases = pgTable('reward_purchases', {
    id: serial('id').primaryKey(),
    rewardId: integer('reward_id').references(() => rewards.id).notNull(),
    userId: integer('user_id').references(() => users.id).notNull(),
    status: text('status').notNull().default('purchased'),
    purchasedAt: timestamp('purchased_at').defaultNow().notNull(),
    redeemedAt: timestamp('redeemed_at'),
    pointSnapshot: jsonb('point_snapshot'),
}, (table) => ({
    rewardPurchaseIdx: uniqueIndex('reward_purchases_reward_user_purchase_idx').on(table.rewardId, table.userId, table.purchasedAt),
}));

export const platformEvents = pgTable('platform_events', {
    id: serial('id').primaryKey(),
    realmId: integer('realm_id').references(() => realms.id).notNull(),
    type: text('type').notNull(),
    actorUserId: integer('actor_user_id').references(() => users.id),
    subjectUserId: integer('subject_user_id').references(() => users.id),
    taskId: integer('task_id').references(() => tasks.id),
    taskRunId: integer('task_run_id').references(() => taskRuns.id),
    rewardId: integer('reward_id').references(() => rewards.id),
    rewardPurchaseId: integer('reward_purchase_id').references(() => rewardPurchases.id),
    commentId: integer('comment_id').references(() => taskRunComments.id),
    summary: text('summary').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    platformEventsRealmCreatedIdx: index('platform_events_realm_created_idx').on(table.realmId, table.createdAt),
    platformEventsTypeIdx: index('platform_events_type_idx').on(table.type, table.createdAt),
}));

export const notifications = pgTable('notifications', {
    id: serial('id').primaryKey(),
    realmId: integer('realm_id').references(() => realms.id).notNull(),
    recipientUserId: integer('recipient_user_id').references(() => users.id).notNull(),
    actorUserId: integer('actor_user_id').references(() => users.id),
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    link: text('link'),
    metadata: jsonb('metadata'),
    readAt: timestamp('read_at'),
    emailStatus: text('email_status').notNull().default('pending'),
    emailedAt: timestamp('emailed_at'),
    emailError: text('email_error'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
