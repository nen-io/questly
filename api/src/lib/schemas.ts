import sanitizeHtml from 'sanitize-html';
import { z, type ZodType } from 'zod';
import type {
    AdminAccessPayload,
    ChangePasswordPayload,
    CompleteTaskPayload,
    CreateActivityCommentPayload,
    CreateCategoryPayload,
    CreatePlayerPayload,
    CreateRewardPayload,
    CreateTaskPayload,
    LoginPayload,
    OnboardingStep,
    PointRulePayload,
    RefreshAssetPayload,
    RefreshableAssetRef,
    ResetPlayerPasswordPayload,
    UpdateAvatarPayload,
    UpdateCategoryAppearancePayload,
    UpdateOnboardingStatePayload,
    UpdatePlayerBalancesPayload,
    UpdateEmailSettingsPayload,
    UpdateSettingsPayload,
    VerifyEmailPayload,
} from '../../../shared/contracts';
import { onboardingSteps } from '../../../shared/contracts';
import { contentMediaSourcePattern, hexColorPattern, httpUrlPattern, imageDataUrlPattern, keyPattern, slugPattern, usernamePattern, videoDataUrlPattern } from '../../../shared/utils/validation';
import { HttpError } from './http';
import { forceHttpsMediaUrl } from './mediaUrl';

const controlCharactersPattern = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const collapsibleWhitespacePattern = /[^\S\r\n]+/g;

const sanitizePlainText = (value: string, multiline = false) => {
    const stripped = sanitizeHtml(value, {
        allowedTags: [],
        allowedAttributes: {},
    }).replace(controlCharactersPattern, '');

    const normalizedLines = stripped
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map((line) => line.replace(collapsibleWhitespacePattern, ' ').trim());

    return multiline
        ? normalizedLines.join('\n').trim()
        : normalizedLines.join(' ').replace(/\s+/g, ' ').trim();
};

const sanitizePassword = (value: string) => value.replace(controlCharactersPattern, '').trim();
const sanitizeOptionalMediaUrl = (value: string | null | undefined) => forceHttpsMediaUrl(value);

const coerceOptionalBoolean = (value: unknown) => {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        if (value === 'true') {
            return true;
        }

        if (value === 'false') {
            return false;
        }
    }

    return value;
};

const coerceNullableNumber = (value: unknown) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    if (typeof value === 'number') {
        return value;
    }

    if (typeof value === 'string') {
        return Number(value);
    }

    return value;
};

const singleLineText = (field: string, min: number, max: number) => z.string()
    .transform((value) => sanitizePlainText(value))
    .refine((value) => value.length >= min, `${field} is required`)
    .refine((value) => value.length <= max, `${field} must be ${max} characters or fewer`);

const optionalSingleLineText = (field: string, max: number) => z.union([
    z.string(),
    z.null(),
    z.undefined(),
])
    .transform((value) => {
        if (typeof value !== 'string') {
            return undefined;
        }

        const sanitized = sanitizePlainText(value);
        return sanitized.length > 0 ? sanitized : undefined;
    })
    .refine((value) => value === undefined || value.length <= max, `${field} must be ${max} characters or fewer`);

const multilineText = (field: string, min: number, max?: number) => {
    let schema = z.string()
        .transform((value) => sanitizePlainText(value, true))
        .refine((value) => value.length >= min, `${field} is required`);

    if (typeof max === 'number') {
        schema = schema.refine((value) => value.length <= max, `${field} must be ${max} characters or fewer`);
    }

    return schema;
};

const optionalMultilineText = (field: string, max: number) => z.union([
    z.string(),
    z.null(),
    z.undefined(),
])
    .transform((value) => {
        if (typeof value !== 'string') {
            return undefined;
        }

        const sanitized = sanitizePlainText(value, true);
        return sanitized.length > 0 ? sanitized : undefined;
    })
    .refine((value) => value === undefined || value.length <= max, `${field} must be ${max} characters or fewer`);

const nullableOptionalSingleLineText = (field: string, max: number) => z.union([
    z.string(),
    z.null(),
    z.undefined(),
])
    .transform((value) => {
        if (typeof value !== 'string') {
            return null;
        }

        const sanitized = sanitizePlainText(value);
        return sanitized.length > 0 ? sanitized : null;
    })
    .refine((value) => value === null || value.length <= max, `${field} must be ${max} characters or fewer`);

const nullableOptionalMultilineText = (field: string, max: number) => z.union([
    z.string(),
    z.null(),
    z.undefined(),
])
    .transform((value) => {
        if (typeof value !== 'string') {
            return null;
        }

        const sanitized = sanitizePlainText(value, true);
        return sanitized.length > 0 ? sanitized : null;
    })
    .refine((value) => value === null || value.length <= max, `${field} must be ${max} characters or fewer`);

const emailSchema = z.union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
        if (typeof value !== 'string') {
            return null;
        }

        const sanitized = sanitizePlainText(value).toLowerCase();
        return sanitized.length > 0 ? sanitized : null;
    })
    .refine((value) => value === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'email must be a valid email');

const colorSchema = z.union([z.string(), z.undefined(), z.null()])
    .transform((value) => {
        if (typeof value !== 'string') {
            return undefined;
        }

        const sanitized = sanitizePlainText(value);
        return sanitized.length > 0 ? sanitized : undefined;
    })
    .refine((value) => value === undefined || hexColorPattern.test(value), 'color must be a valid hex color');

const slugSchema = optionalSingleLineText('slug', 80)
    .refine((value) => value === undefined || slugPattern.test(value), 'slug may only contain letters, numbers, hyphens, and underscores');

const themeKeySchema = singleLineText('themePresetKey', 1, 64)
    .refine((value) => keyPattern.test(value), 'themePresetKey must be letters, numbers, hyphens, or underscores');

const fontPresetKeySchema = singleLineText('fontPresetKey', 1, 64)
    .refine((value) => keyPattern.test(value), 'fontPresetKey must be letters, numbers, hyphens, or underscores');

const usernameSchema = singleLineText('username', 3, 32)
    .transform((value) => value.toLowerCase())
    .refine((value) => usernamePattern.test(value), 'username may only contain lowercase letters, numbers, hyphens, and underscores');

const passwordSchema = z.string()
    .transform((value) => sanitizePassword(value))
    .refine((value) => value.length >= 8, 'password must be at least 8 characters')
    .refine((value) => value.length <= 128, 'password must be 128 characters or fewer');

const onboardingStepSchema: ZodType<OnboardingStep> = z.union([z.enum(onboardingSteps), z.literal('landing')]);

const avatarDataUrlSchema = z.union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
        if (typeof value !== 'string') {
            return null;
        }

        const sanitized = value.trim();
        return sanitized.length > 0 ? sanitized : null;
    })
    .refine((value) => value === null || imageDataUrlPattern.test(value), 'avatarDataUrl must be a supported image data URL')
    .refine((value) => value === null || value.length <= 8_000_000, 'avatarDataUrl is too large');

const loginImageSchema = z.union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
        if (typeof value !== 'string') {
            return null;
        }

        const sanitized = sanitizeOptionalMediaUrl(value);
        return sanitized && sanitized.length > 0 ? sanitized : null;
    })
    .refine(
        (value) => value === null
            || imageDataUrlPattern.test(value)
            || httpUrlPattern.test(value),
        'loginImageUrl must be a supported image data URL or absolute URL',
    )
    .refine((value) => value === null || value.length <= 12_000_000, 'loginImageUrl is too large');

const loginBackgroundImageSchema = z.union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
        if (typeof value !== 'string') {
            return null;
        }

        const sanitized = sanitizeOptionalMediaUrl(value);
        return sanitized && sanitized.length > 0 ? sanitized : null;
    })
    .refine(
        (value) => value === null
            || imageDataUrlPattern.test(value)
            || httpUrlPattern.test(value),
        'loginBackgroundImageUrl must be a supported image data URL or absolute URL',
    )
    .refine((value) => value === null || value.length <= 12_000_000, 'loginBackgroundImageUrl is too large');

const loginBackgroundVideoSchema = z.union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
        if (typeof value !== 'string') {
            return null;
        }

        const sanitized = sanitizeOptionalMediaUrl(value);
        return sanitized && sanitized.length > 0 ? sanitized : null;
    })
    .refine(
        (value) => value === null
            || videoDataUrlPattern.test(value)
            || httpUrlPattern.test(value),
        'loginBackgroundVideoUrl must be a supported video data URL or absolute URL',
    )
    .refine((value) => value === null || value.length <= 32_000_000, 'loginBackgroundVideoUrl is too large');

const loginBackgroundImageSourceSchema = z.union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
        if (typeof value !== 'string') {
            return null;
        }

        const sanitized = sanitizeOptionalMediaUrl(value);
        return sanitized && sanitized.length > 0 ? sanitized : null;
    })
    .refine(
        (value) => value === null
            || imageDataUrlPattern.test(value)
            || httpUrlPattern.test(value)
            || contentMediaSourcePattern.test(value),
        'loginBackgroundImageSource must be a supported image source',
    );

const loginBackgroundVideoSourceSchema = z.union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
        if (typeof value !== 'string') {
            return null;
        }

        const sanitized = sanitizeOptionalMediaUrl(value);
        return sanitized && sanitized.length > 0 ? sanitized : null;
    })
    .refine(
        (value) => value === null
            || videoDataUrlPattern.test(value)
            || httpUrlPattern.test(value)
            || contentMediaSourcePattern.test(value),
        'loginBackgroundVideoSource must be a supported video source',
    );

const integerSchema = (field: string, min: number, max: number) => z.preprocess(
    (value) => typeof value === 'string' && value.trim() !== '' ? Number(value) : value,
    z.number().int(`${field} must be a whole number`).min(min, `${field} must be at least ${min}`).max(max, `${field} must be at most ${max}`),
);

const nullableIntegerSchema = (field: string, min: number, max: number) => z.preprocess(
    coerceNullableNumber,
    z.union([
        z.number().int(`${field} must be a whole number`).min(min, `${field} must be at least ${min}`).max(max, `${field} must be at most ${max}`),
        z.null(),
    ]),
);

const optionalBooleanSchema = (fallback?: boolean) => z.preprocess(
    coerceOptionalBoolean,
    fallback === undefined ? z.boolean() : z.boolean().optional().default(fallback),
);

const pointRuleSchema: ZodType<PointRulePayload> = z.object({
    categoryId: integerSchema('categoryId', 1, Number.MAX_SAFE_INTEGER),
    amount: integerSchema('amount', 1, 1_000_000),
}).strict();

const pointRulesArraySchema = (field: string) => z.array(pointRuleSchema)
    .max(50, `${field} must contain 50 rules or fewer`);

const queryTextSchema = z.union([z.string(), z.undefined()]).optional()
    .transform((value) => value === undefined ? undefined : sanitizePlainText(value))
    .refine((value) => value === undefined || value.length <= 120, 'search must be 120 characters or fewer');

const categoryIdsQuerySchema = z.union([z.string(), z.undefined()]).optional()
    .transform((value) => {
        if (value === undefined) {
            return [];
        }

        const sanitized = sanitizePlainText(value);
        if (!sanitized) {
            return [];
        }

        return sanitized
            .split(',')
            .map((part) => Number(part.trim()))
            .filter((part) => Number.isFinite(part));
    })
    .refine(
        (values) => Array.isArray(values) && values.every((value) => Number.isInteger(value) && value >= 1),
        'categoryIds must be a comma-separated list of positive integers',
    );

export const loginPayloadSchema: ZodType<LoginPayload> = z.object({
    username: usernameSchema,
    password: passwordSchema,
}).strict();

export const adminAccessPayloadSchema: ZodType<AdminAccessPayload> = z.object({
    password: passwordSchema,
}).strict();

export const changePasswordPayloadSchema: ZodType<ChangePasswordPayload> = z.object({
    currentPassword: passwordSchema.optional(),
    newPassword: passwordSchema,
    email: emailSchema.optional(),
    avatarDataUrl: avatarDataUrlSchema.optional(),
}).strict();

export const updateEmailSettingsPayloadSchema: ZodType<UpdateEmailSettingsPayload> = z.object({
    email: emailSchema,
    emailNotificationsEnabled: optionalBooleanSchema().transform((value) => value as boolean),
    inAppNotificationsEnabled: optionalBooleanSchema().transform((value) => value as boolean),
}).strict();

export const updateAvatarPayloadSchema: ZodType<UpdateAvatarPayload> = z.object({
    avatarDataUrl: avatarDataUrlSchema,
}).strict();

export const verifyEmailPayloadSchema: ZodType<VerifyEmailPayload> = z.object({
    token: singleLineText('token', 8, 512),
}).strict();

export const createPlayerPayloadSchema: ZodType<CreatePlayerPayload> = z.object({
    username: usernameSchema,
    displayName: singleLineText('displayName', 1, 60),
    temporaryPassword: passwordSchema,
}).strict();

export const resetPlayerPasswordPayloadSchema: ZodType<ResetPlayerPasswordPayload> = z.object({
    temporaryPassword: passwordSchema,
}).strict();

export const createCategoryPayloadSchema: ZodType<CreateCategoryPayload> = z.object({
    name: singleLineText('name', 1, 60),
    description: optionalMultilineText('description', 280).optional(),
    color: colorSchema.optional(),
    icon: optionalSingleLineText('icon', 16).optional(),
    sortOrder: integerSchema('sortOrder', 0, 10_000).optional(),
    isActive: optionalBooleanSchema(true),
}).strict();

export const updateCategoryAppearancePayloadSchema: ZodType<UpdateCategoryAppearancePayload> = z.object({
    name: singleLineText('name', 1, 60),
    color: colorSchema.optional(),
    icon: optionalSingleLineText('icon', 16).optional(),
}).strict();

export const updateSettingsPayloadSchema: ZodType<UpdateSettingsPayload> = z.object({
    platformName: singleLineText('platformName', 1, 80),
    themePresetKey: themeKeySchema,
    onboardingCompleted: optionalBooleanSchema(false),
    content: z.object({
        fontPresetKey: fontPresetKeySchema,
        loginTitle: singleLineText('content.loginTitle', 1, 120),
        loginMessage: multilineText('content.loginMessage', 1),
        loginImageUrl: loginImageSchema,
        loginBackgroundImageUrl: loginBackgroundImageSchema,
        loginBackgroundImageSource: loginBackgroundImageSourceSchema,
        loginBackgroundVideoUrl: loginBackgroundVideoSchema,
        loginBackgroundVideoSource: loginBackgroundVideoSourceSchema,
        dashboardTitle: singleLineText('content.dashboardTitle', 1, 120),
        dashboardMessage: multilineText('content.dashboardMessage', 1, 500),
        onboardingIntroEyebrow: singleLineText('content.onboardingIntroEyebrow', 1, 80),
        onboardingIntroTitle: singleLineText('content.onboardingIntroTitle', 1, 120),
        onboardingIntroMessage: multilineText('content.onboardingIntroMessage', 1, 500),
        onboardingLaunchTitle: singleLineText('content.onboardingLaunchTitle', 1, 120),
        onboardingLaunchMessage: multilineText('content.onboardingLaunchMessage', 1, 500),
    }).strict(),
}).strict();

export const updateOnboardingStatePayloadSchema: ZodType<UpdateOnboardingStatePayload> = z.object({
    currentStep: onboardingStepSchema.optional(),
    completedSteps: z.array(onboardingStepSchema).max(8).optional(),
    lastVisitedStep: onboardingStepSchema.optional(),
}).strict();

export const createTaskPayloadSchema: ZodType<CreateTaskPayload> = z.object({
    title: singleLineText('title', 1, 120),
    slug: slugSchema.optional(),
    description: optionalMultilineText('description', 500).optional(),
    color: colorSchema.optional(),
    icon: optionalSingleLineText('icon', 16).optional(),
    recurrence: z.enum(['daily', 'weekly', 'monthly', 'one_time']),
    assignmentMode: z.enum(['all_players', 'selected_players']),
    userIds: z.array(integerSchema('userIds', 1, Number.MAX_SAFE_INTEGER)).max(100).default([]),
    rewardRules: pointRulesArraySchema('rewardRules'),
    penaltyRules: pointRulesArraySchema('penaltyRules'),
    expiresInHours: nullableIntegerSchema('expiresInHours', 1, 24 * 365),
    isActive: optionalBooleanSchema(true),
}).strict().superRefine((value, context) => {
    if (value.assignmentMode === 'selected_players' && value.userIds.length === 0) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['userIds'],
            message: 'Select at least one player when using selected players',
        });
    }

    if (value.rewardRules.length === 0 && value.penaltyRules.length === 0) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['rewardRules'],
            message: 'Add at least one reward or penalty value',
        });
    }
});

export const createRewardPayloadSchema: ZodType<CreateRewardPayload> = z.object({
    title: singleLineText('title', 1, 120),
    slug: slugSchema.optional(),
    description: optionalMultilineText('description', 500).optional(),
    color: colorSchema.optional(),
    icon: optionalSingleLineText('icon', 16).optional(),
    assignmentMode: z.enum(['all_players', 'selected_players']),
    userIds: z.array(integerSchema('userIds', 1, Number.MAX_SAFE_INTEGER)).max(100).default([]),
    costs: pointRulesArraySchema('costs'),
    cooldownDays: integerSchema('cooldownDays', 0, 3650),
    isRedeemable: optionalBooleanSchema(true),
    isActive: optionalBooleanSchema(true),
}).strict().superRefine((value, context) => {
    if (value.assignmentMode === 'selected_players' && value.userIds.length === 0) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['userIds'],
            message: 'Select at least one player when using selected players',
        });
    }

    if (value.costs.length === 0) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['costs'],
            message: 'Add at least one kudos cost',
        });
    }
});

export const completeTaskPayloadSchema: ZodType<CompleteTaskPayload> = z.object({
    notes: optionalMultilineText('notes', 1_000).optional(),
}).strict();

export const createActivityCommentPayloadSchema: ZodType<CreateActivityCommentPayload> = z.object({
    body: multilineText('body', 1, 1_000),
}).strict();

export const updatePlayerBalancesPayloadSchema: ZodType<UpdatePlayerBalancesPayload> = z.object({
    balances: z.array(z.object({
        categoryId: integerSchema('categoryId', 1, Number.MAX_SAFE_INTEGER),
        balance: integerSchema('balance', 0, 1_000_000),
    }).strict()).max(100),
}).strict();

export const refreshableAssetRefSchema: ZodType<RefreshableAssetRef> = z.discriminatedUnion('kind', [
    z.object({
        kind: z.literal('avatar'),
        userId: integerSchema('userId', 1, Number.MAX_SAFE_INTEGER),
    }).strict(),
    z.object({
        kind: z.literal('content_media'),
        slot: z.enum(['login_background_image', 'login_background_video']),
    }).strict(),
    z.object({
        kind: z.literal('task_run_media'),
        mediaId: integerSchema('mediaId', 1, Number.MAX_SAFE_INTEGER),
        variant: z.enum(['full', 'thumbnail']),
    }).strict(),
]);

export const refreshAssetPayloadSchema: ZodType<RefreshAssetPayload> = z.object({
    asset: refreshableAssetRefSchema,
}).strict();

export const idParamSchema = (field: string) => z.object({
    id: integerSchema(field, 1, Number.MAX_SAFE_INTEGER),
}).strict();

export const slugParamSchema = z.object({
    slug: singleLineText('slug', 1, 120)
        .refine((value) => /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/i.test(value), 'slug may only contain letters, numbers, hyphens, and underscores'),
}).strict();

export const activityRunsQuerySchema = z.object({
    page: z.union([z.string(), z.number(), z.undefined()]).optional(),
    pageSize: z.union([z.string(), z.number(), z.undefined()]).optional(),
    playerId: z.union([z.string(), z.number(), z.undefined()]).optional()
        .transform((value) => value === undefined || value === '' ? undefined : Number(value))
        .refine((value) => value === undefined || (Number.isInteger(value) && value >= 1), 'playerId must be a positive integer'),
    search: queryTextSchema,
}).strict();

export const taskCatalogQuerySchema = z.object({
    page: z.union([z.string(), z.number(), z.undefined()]).optional(),
    pageSize: z.union([z.string(), z.number(), z.undefined()]).optional(),
    search: queryTextSchema,
    categoryIds: categoryIdsQuerySchema,
    collection: z.union([z.enum(['active', 'available']), z.undefined()]).optional(),
}).strict();

export const rewardCatalogQuerySchema = z.object({
    page: z.union([z.string(), z.number(), z.undefined()]).optional(),
    pageSize: z.union([z.string(), z.number(), z.undefined()]).optional(),
    search: queryTextSchema,
    categoryIds: categoryIdsQuerySchema,
    collection: z.union([z.enum(['owned', 'available']), z.undefined()]).optional(),
}).strict();

export const adminCatalogQuerySchema = z.object({
    page: z.union([z.string(), z.number(), z.undefined()]).optional(),
    pageSize: z.union([z.string(), z.number(), z.undefined()]).optional(),
    search: queryTextSchema,
}).strict();

export const paginationQuerySchema = z.object({
    page: z.union([z.string(), z.number(), z.undefined()]).optional(),
    pageSize: z.union([z.string(), z.number(), z.undefined()]).optional(),
}).strict();

export const parseWithSchema = <T>(schema: ZodType<T>, input: unknown): T => {
    const result = schema.safeParse(input);
    if (!result.success) {
        const firstIssue = result.error.issues[0];
        throw new HttpError(400, firstIssue?.message || 'Invalid request payload');
    }

    return result.data;
};
