import type { UseFormReturn } from 'react-hook-form'

import { buildRuleFormEntries } from '@/schemas/forms'
import type { AdminBootstrap, AdminCategory, AdminReward, AdminTask } from '@/types/app'
import type { AdminSection } from '@/routes/app'
import { adminSectionMeta } from './meta'

export type AssignmentMode = 'all_players' | 'selected_players'

export function getSettingsDefaults(bootstrap: AdminBootstrap) {
  return {
    platformName: bootstrap.settings.platformName,
    themePresetKey: bootstrap.settings.theme.key,
    onboardingCompleted: bootstrap.setup.isLaunched,
    content: {
      fontPresetKey: bootstrap.settings.content.fontPresetKey,
      loginTitle: bootstrap.settings.content.loginTitle,
      loginMessage: bootstrap.settings.content.loginMessage,
      loginImageUrl: bootstrap.settings.content.loginImageUrl,
      loginBackgroundImageUrl: bootstrap.settings.content.loginBackgroundImageUrl,
      loginBackgroundImageSource: bootstrap.settings.content.loginBackgroundImageSource,
      loginBackgroundVideoUrl: bootstrap.settings.content.loginBackgroundVideoUrl,
      loginBackgroundVideoSource: bootstrap.settings.content.loginBackgroundVideoSource,
      dashboardTitle: bootstrap.settings.content.dashboardTitle,
      dashboardMessage: bootstrap.settings.content.dashboardMessage,
      onboardingIntroEyebrow: bootstrap.settings.content.onboardingIntroEyebrow,
      onboardingIntroTitle: bootstrap.settings.content.onboardingIntroTitle,
      onboardingIntroMessage: bootstrap.settings.content.onboardingIntroMessage,
      onboardingLaunchTitle: bootstrap.settings.content.onboardingLaunchTitle,
      onboardingLaunchMessage: bootstrap.settings.content.onboardingLaunchMessage,
    },
  }
}

function toRuleFormValues(entries?: Array<{ categoryId: number; amount: number }>) {
  return entries?.map((entry) => ({
    categoryId: entry.categoryId,
    amount: String(entry.amount),
  }))
}

export function getQuestDefaults(categoryIds: number[], existing?: AdminTask) {
  return {
    title: existing?.title ?? '',
    description: existing?.description ?? '',
    color: existing?.color ?? '',
    icon: existing?.icon ?? '',
    recurrence: (existing?.recurrence as 'daily' | 'weekly' | 'monthly' | 'one_time' | undefined) ?? 'daily',
    expiresInHours: existing?.expiresInHours ? String(existing.expiresInHours) : '24',
    assignmentMode: existing?.assignmentMode ?? 'all_players',
    userIds: existing?.userIds ?? ([] as number[]),
    rewardRules: buildRuleFormEntries(categoryIds, toRuleFormValues(existing?.rewardRules)),
    penaltyRules: buildRuleFormEntries(categoryIds, toRuleFormValues(existing?.penaltyRules)),
  }
}

export function getRewardDefaults(categoryIds: number[], existing?: AdminReward) {
  return {
    title: existing?.title ?? '',
    description: existing?.description ?? '',
    color: existing?.color ?? '',
    icon: existing?.icon ?? '',
    cooldownDays: String(existing?.cooldownDays ?? 0),
    assignmentMode: existing?.assignmentMode ?? 'all_players',
    userIds: existing?.userIds ?? ([] as number[]),
    costs: buildRuleFormEntries(categoryIds, toRuleFormValues(existing?.costs)),
  }
}

export type QuestFormValues = ReturnType<typeof getQuestDefaults>
export type RewardFormValues = ReturnType<typeof getRewardDefaults>

export function getSectionIndex(section: AdminSection) {
  return adminSectionMeta.findIndex((item) => item.id === section)
}

export function updateRuleValue(
  form: UseFormReturn<any>,
  fieldName: 'rewardRules' | 'penaltyRules' | 'costs',
  categoryId: number,
  nextAmount: string,
) {
  const current = (form.getValues(fieldName as never) as unknown as Array<{ categoryId: number; amount: string }> | undefined) || []
  const nextValues = current.map((entry) => (
    entry.categoryId === categoryId
      ? { ...entry, amount: nextAmount }
      : entry
  ))

  form.setValue(fieldName as never, nextValues as never, {
    shouldDirty: true,
    shouldValidate: true,
  })
}

export function findCategoryName(categories: AdminCategory[], categoryId: number) {
  return categories.find((category) => category.id === categoryId)?.name || 'Kudos'
}

export function mergePlayerBalances(
  balances: AdminBootstrap['players'][number]['balances'] | undefined,
  categories: AdminCategory[],
) {
  const balanceMap = new Map((balances ?? []).map((balance) => [balance.categoryId, balance]))

  return categories
    .filter((category) => category.isActive)
    .map((category) => {
      const existing = balanceMap.get(category.id)
      return {
        categoryId: category.id,
        slug: existing?.slug ?? category.slug,
        name: existing?.name ?? category.name,
        color: existing?.color ?? category.color,
        icon: existing?.icon ?? category.icon,
        balance: existing?.balance ?? 0,
      }
    })
}

export function toTaskPayloadFromTask(task: AdminTask) {
  return {
    title: task.title,
    description: task.description || undefined,
    color: task.color || undefined,
    icon: task.icon || undefined,
    recurrence: task.recurrence as 'daily' | 'weekly' | 'monthly' | 'one_time',
    expiresInHours: task.expiresInHours,
    assignmentMode: task.assignmentMode,
    userIds: task.userIds ?? [],
    rewardRules: (task.rewardRules ?? []).map((rule) => ({
      categoryId: rule.categoryId,
      amount: rule.amount,
    })),
    penaltyRules: (task.penaltyRules ?? []).map((rule) => ({
      categoryId: rule.categoryId,
      amount: rule.amount,
    })),
    isActive: task.isActive,
  }
}

export function toRewardPayloadFromReward(reward: AdminReward) {
  return {
    title: reward.title,
    description: reward.description || undefined,
    color: reward.color || undefined,
    icon: reward.icon || undefined,
    assignmentMode: reward.assignmentMode,
    userIds: reward.userIds ?? [],
    costs: (reward.costs ?? []).map((cost) => ({
      categoryId: cost.categoryId,
      amount: cost.amount,
    })),
    cooldownDays: reward.cooldownDays,
    isRedeemable: reward.isRedeemable,
    isActive: reward.isActive,
  }
}
