import type { z } from 'zod/v4'

import {
  createPlayerFormSchema,
  createCategoryFormSchema,
  createRewardFormSchema,
  createTaskFormSchema,
  updateCategoryAppearanceFormSchema,
  updateSettingsFormSchema,
} from '@/schemas/forms'
import type { AdminBootstrap } from '@/types/app'

export type SettingsFormValues = z.output<typeof updateSettingsFormSchema>
export type SettingsForm = any

export type PlayerFormValues = z.output<typeof createPlayerFormSchema>
export type PlayerForm = any

export type AttributeFormValues = z.output<typeof createCategoryFormSchema>
export type AttributeForm = any

export type AttributeAppearanceFormValues = z.output<typeof updateCategoryAppearanceFormSchema>
export type AttributeAppearanceForm = any

export type QuestFormValues = z.output<typeof createTaskFormSchema>
export type QuestForm = any

export type RewardFormValues = z.output<typeof createRewardFormSchema>
export type RewardForm = any

export type OnboardingCategory = AdminBootstrap['categories'][number]
export type OnboardingPlayer = AdminBootstrap['players'][number]
