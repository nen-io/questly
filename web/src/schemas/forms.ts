import { z } from 'zod/v4'
import type {
  ChangePasswordPayload,
  CompleteTaskPayload,
  CreateCategoryPayload,
  CreateRewardPayload,
  CreateTaskPayload,
  PointRulePayload,
  UpdateCategoryAppearancePayload,
  UpdatePlayerBalancesPayload,
  UpdateEmailSettingsPayload,
} from '@shared/contracts'
import {
  contentMediaSourcePattern,
  hexColorPattern,
  httpUrlPattern,
  imageDataUrlPattern,
  usernamePattern,
  videoDataUrlPattern,
} from '@shared/utils/validation'

const allowedMediaTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
])

const maxUploadFiles = 10
const maxUploadFileSize = 100 * 1024 * 1024

const trimmedString = (field: string, min: number, max?: number) => {
  let schema = z.string()
    .trim()
    .min(min, `${field} is required`)

  if (typeof max === 'number') {
    schema = schema.max(max, `${field} must be ${max} characters or fewer`)
  }

  return schema
}

const optionalTrimmedString = (field: string, max: number) =>
  z.string()
    .trim()
    .max(max, `${field} must be ${max} characters or fewer`)
    .optional()
    .or(z.literal(''))
    .transform((value) => value?.trim() || '')

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be 128 characters or fewer')

const pointRuleAmountInputSchema = z.object({
  categoryId: z.number().int().positive(),
  amount: z.string()
    .trim()
    .refine((value) => value === '' || /^[0-9]+$/.test(value), 'Use a whole number or leave blank'),
})

const recurrenceSchema = z.enum(['daily', 'weekly', 'monthly', 'one_time'])
const assignmentModeSchema = z.enum(['all_players', 'selected_players'])

const optionalEmailInputSchema = z.string()
  .trim()
  .refine((value) => value === '' || z.email().safeParse(value).success, 'Enter a valid email address')

const nullableMediaSourceSchema = (
  validator: (value: string) => boolean,
  message: string,
) => z.string()
  .trim()
  .nullable()
  .optional()
  .or(z.literal(''))
  .transform((value) => {
    if (typeof value !== 'string') {
      return null
    }

    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  })
  .refine((value) => value === null || validator(value), message)

export const loginFormSchema = z.object({
  username: z.string()
    .trim()
    .toLowerCase()
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username must be 32 characters or fewer')
    .refine((value) => usernamePattern.test(value), 'Username may only contain lowercase letters, numbers, hyphens, and underscores'),
  password: passwordSchema,
})

export const adminAccessFormSchema = z.object({
  password: passwordSchema,
})

export const changePasswordFormSchema = z.object({
  newPassword: passwordSchema,
  confirmNewPassword: passwordSchema,
  email: optionalEmailInputSchema,
  avatarDataUrl: z.string().nullable(),
}).refine(
  (value) => value.newPassword === value.confirmNewPassword,
  {
    path: ['confirmNewPassword'],
    message: 'Passwords must match',
  },
)

export const updateEmailSettingsFormSchema = z.object({
  email: optionalEmailInputSchema,
  emailNotificationsEnabled: z.boolean(),
  inAppNotificationsEnabled: z.boolean(),
})

export const createPlayerFormSchema = z.object({
  displayName: trimmedString('Display name', 1, 60),
  username: z.string()
    .trim()
    .toLowerCase()
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username must be 32 characters or fewer')
    .refine((value) => usernamePattern.test(value), 'Username may only contain lowercase letters, numbers, hyphens, and underscores'),
  temporaryPassword: passwordSchema,
})

export const resetPlayerPasswordFormSchema = z.object({
  temporaryPassword: passwordSchema,
})

export const createCategoryFormSchema = z.object({
  name: trimmedString('Name', 1, 60),
  description: optionalTrimmedString('Description', 280),
  color: z.string()
    .trim()
    .refine((value) => value.length === 0 || hexColorPattern.test(value), 'Use a valid hex color')
    .transform((value) => value || '#1f2937'),
  icon: optionalTrimmedString('Icon', 16),
})

export const updateCategoryAppearanceFormSchema = z.object({
  name: trimmedString('Name', 1, 60),
  color: z.string()
    .trim()
    .refine((value) => value.length === 0 || hexColorPattern.test(value), 'Use a valid hex color')
    .transform((value) => value || '#1f2937'),
  icon: optionalTrimmedString('Icon', 16),
})

export const updateSettingsFormSchema = z.object({
  platformName: trimmedString('Platform name', 1, 80),
  themePresetKey: z.string().trim().min(1, 'Choose a theme'),
  onboardingCompleted: z.boolean(),
  content: z.object({
    fontPresetKey: z.string().trim().min(1, 'Choose a font preset'),
    loginTitle: trimmedString('Login title', 1, 120),
    loginMessage: trimmedString('Login message', 1),
    loginImageUrl: z.string()
      .nullable()
      .refine(
        (value) => value === null || imageDataUrlPattern.test(value) || httpUrlPattern.test(value),
        'Use a supported image',
      ),
    loginBackgroundImageUrl: z.string()
      .nullable()
      .refine(
        (value) => value === null || imageDataUrlPattern.test(value) || httpUrlPattern.test(value),
        'Use a supported image',
      ),
    loginBackgroundImageSource: nullableMediaSourceSchema(
      (value) => imageDataUrlPattern.test(value) || httpUrlPattern.test(value) || contentMediaSourcePattern.test(value),
      'Use a supported image source',
    ),
    loginBackgroundVideoUrl: z.string()
      .nullable()
      .refine(
        (value) => value === null || videoDataUrlPattern.test(value) || httpUrlPattern.test(value),
        'Use a supported video',
      ),
    loginBackgroundVideoSource: nullableMediaSourceSchema(
      (value) => videoDataUrlPattern.test(value) || httpUrlPattern.test(value) || contentMediaSourcePattern.test(value),
      'Use a supported video source',
    ),
    dashboardTitle: trimmedString('Dashboard title', 1, 120),
    dashboardMessage: trimmedString('Dashboard message', 1, 500),
    onboardingIntroEyebrow: trimmedString('Onboarding intro eyebrow', 1, 80),
    onboardingIntroTitle: trimmedString('Onboarding intro title', 1, 120),
    onboardingIntroMessage: trimmedString('Onboarding intro message', 1, 500),
    onboardingLaunchTitle: trimmedString('Onboarding launch title', 1, 120),
    onboardingLaunchMessage: trimmedString('Onboarding launch message', 1, 500),
  }),
})

export const createTaskFormSchema = z.object({
  title: trimmedString('Title', 1, 120),
  description: optionalTrimmedString('Description', 500),
  color: z.string()
    .trim()
    .refine((value) => value.length === 0 || hexColorPattern.test(value), 'Use a valid hex color')
    .transform((value) => value || ''),
  icon: optionalTrimmedString('Icon', 16),
  recurrence: recurrenceSchema,
  expiresInHours: z.string()
    .trim()
    .refine((value) => value === '' || /^[0-9]+$/.test(value), 'Expires in hours must be a whole number')
    .refine((value) => value === '' || Number(value) >= 1, 'Expires in hours must be at least 1')
    .refine((value) => value === '' || Number(value) <= 24 * 365, 'Expires in hours must be 8760 or fewer'),
  assignmentMode: assignmentModeSchema,
  userIds: z.array(z.number().int().positive()).max(100),
  rewardRules: z.array(pointRuleAmountInputSchema).max(50),
  penaltyRules: z.array(pointRuleAmountInputSchema).max(50),
}).superRefine((value, context) => {
  if (value.assignmentMode === 'selected_players' && value.userIds.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['userIds'],
      message: 'Select at least one player',
    })
  }

  const hasAnyRule = [...value.rewardRules, ...value.penaltyRules].some((rule) => Number(rule.amount || 0) > 0)
  if (!hasAnyRule) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['rewardRules'],
      message: 'Add at least one reward or penalty value',
    })
  }
})

export const createRewardFormSchema = z.object({
  title: trimmedString('Title', 1, 120),
  description: optionalTrimmedString('Description', 500),
  color: z.string()
    .trim()
    .refine((value) => value.length === 0 || hexColorPattern.test(value), 'Use a valid hex color')
    .transform((value) => value || ''),
  icon: optionalTrimmedString('Icon', 16),
  cooldownDays: z.string()
    .trim()
    .refine((value) => /^[0-9]+$/.test(value), 'Cooldown days must be a whole number')
    .refine((value) => Number(value) >= 0, 'Cooldown days cannot be negative')
    .refine((value) => Number(value) <= 3650, 'Cooldown days must be 3650 or fewer'),
  assignmentMode: assignmentModeSchema,
  userIds: z.array(z.number().int().positive()).max(100),
  costs: z.array(pointRuleAmountInputSchema).max(50),
}).superRefine((value, context) => {
  if (value.assignmentMode === 'selected_players' && value.userIds.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['userIds'],
      message: 'Select at least one player',
    })
  }

  const hasAnyCost = value.costs.some((rule) => Number(rule.amount || 0) > 0)
  if (!hasAnyCost) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['costs'],
      message: 'Add at least one category cost',
    })
  }
})

export const createActivityCommentFormSchema = z.object({
  body: trimmedString('Comment', 1, 1000),
})

export const updatePlayerBalancesFormSchema = z.object({
  balances: z.array(z.object({
    categoryId: z.number().int().positive(),
    balance: z.string()
      .trim()
      .refine((value) => value === '' || /^[0-9]+$/.test(value), 'Use a whole number or leave blank')
      .transform((value) => value || '0'),
  })).max(100),
})

export const completeTaskFormSchema = z.object({
  notes: z.string().trim().max(1000, 'Notes must be 1000 characters or fewer').optional().or(z.literal('')),
  files: z.array(z.custom<File>())
    .max(maxUploadFiles, `You can upload up to ${maxUploadFiles} files`)
    .refine(
      (files) => files.every((file) => allowedMediaTypes.has(file.type)),
      'Only JPEG, PNG, WEBP, HEIC, HEIF, MP4, WEBM, and MOV files are supported',
    )
    .refine(
      (files) => files.every((file) => file.size <= maxUploadFileSize),
      'Each file must be 100 MB or smaller',
    ),
})

export function toChangePasswordPayload(values: z.infer<typeof changePasswordFormSchema>): ChangePasswordPayload {
  return {
    newPassword: values.newPassword,
    email: values.email ? values.email : null,
    avatarDataUrl: values.avatarDataUrl,
  }
}

export function toUpdateEmailSettingsPayload(values: z.infer<typeof updateEmailSettingsFormSchema>): UpdateEmailSettingsPayload {
  return {
    email: values.email ? values.email : null,
    emailNotificationsEnabled: values.emailNotificationsEnabled,
    inAppNotificationsEnabled: values.inAppNotificationsEnabled,
  }
}

export function toCreateCategoryPayload(values: z.infer<typeof createCategoryFormSchema>): CreateCategoryPayload {
  return {
    name: values.name,
    description: values.description || undefined,
    color: values.color || undefined,
    icon: values.icon || undefined,
  }
}

export function toUpdateCategoryAppearancePayload(
  values: z.infer<typeof updateCategoryAppearanceFormSchema>,
): UpdateCategoryAppearancePayload {
  return {
    name: values.name,
    color: values.color || undefined,
    icon: values.icon || undefined,
  }
}

function toPointRulePayload(entries: Array<{ categoryId: number; amount: string }>): PointRulePayload[] {
  return entries
    .map((entry) => ({
      categoryId: entry.categoryId,
      amount: Number(entry.amount || 0),
    }))
    .filter((entry) => Number.isFinite(entry.amount) && entry.amount > 0)
}

export function toCreateTaskPayload(values: z.infer<typeof createTaskFormSchema>): CreateTaskPayload {
  return {
    title: values.title,
    description: values.description || undefined,
    color: values.color || undefined,
    icon: values.icon || undefined,
    recurrence: values.recurrence,
    expiresInHours: values.expiresInHours ? Number(values.expiresInHours) : null,
    assignmentMode: values.assignmentMode,
    userIds: values.userIds,
    rewardRules: toPointRulePayload(values.rewardRules),
    penaltyRules: toPointRulePayload(values.penaltyRules),
  }
}

export function toCreateRewardPayload(values: z.infer<typeof createRewardFormSchema>): CreateRewardPayload {
  return {
    title: values.title,
    description: values.description || undefined,
    color: values.color || undefined,
    icon: values.icon || undefined,
    cooldownDays: Number(values.cooldownDays),
    assignmentMode: values.assignmentMode,
    userIds: values.userIds,
    costs: toPointRulePayload(values.costs),
    isRedeemable: true,
  }
}

export function toCompleteTaskPayload(values: z.infer<typeof completeTaskFormSchema>): CompleteTaskPayload & { files: File[] } {
  return {
    notes: values.notes?.trim() ? values.notes.trim() : null,
    files: values.files,
  }
}

export function buildRuleFormEntries(categoryIds: number[], current?: Array<{ categoryId: number; amount: string }>) {
  const byId = new Map(current?.map((entry) => [entry.categoryId, entry.amount]) || [])
  return categoryIds.map((categoryId) => ({
    categoryId,
    amount: byId.get(categoryId) || '',
  }))
}

export function buildBalanceFormEntries(
  balances?: Array<{ categoryId: number; balance: number }> | null,
) {
  return (balances ?? []).map((entry) => ({
    categoryId: entry.categoryId,
    balance: String(entry.balance),
  }))
}

export function toUpdatePlayerBalancesPayload(
  values: z.infer<typeof updatePlayerBalancesFormSchema>,
): UpdatePlayerBalancesPayload {
  return {
    balances: values.balances.map((entry) => ({
      categoryId: entry.categoryId,
      balance: Number(entry.balance || 0),
    })),
  }
}
