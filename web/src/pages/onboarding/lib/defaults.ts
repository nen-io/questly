import type { AdminBootstrap, AdminReward, AdminTask } from '@/types/app'
import { buildRuleFormEntries } from '@/schemas/forms'

import type { QuestFormValues, RewardFormValues, SettingsFormValues } from './types'

function toRuleFormValues(entries?: Array<{ categoryId: number; amount: number }>) {
  return entries?.map((entry) => ({
    categoryId: entry.categoryId,
    amount: String(entry.amount),
  }))
}

export function getSettingsDefaults(bootstrap: AdminBootstrap): SettingsFormValues {
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

export function getQuestDefaults(categoryIds: number[]): QuestFormValues {
  return {
    title: '',
    description: '',
    color: '',
    icon: '',
    recurrence: 'daily',
    expiresInHours: '',
    assignmentMode: 'all_players',
    userIds: [],
    rewardRules: buildRuleFormEntries(categoryIds),
    penaltyRules: buildRuleFormEntries(categoryIds),
  }
}

export function getRewardDefaults(categoryIds: number[]): RewardFormValues {
  return {
    title: '',
    description: '',
    color: '',
    icon: '',
    cooldownDays: '0',
    assignmentMode: 'all_players',
    userIds: [],
    costs: buildRuleFormEntries(categoryIds),
  }
}

export function getQuestDefaultsFromTask(categoryIds: number[], existing?: AdminTask): QuestFormValues {
  return {
    title: existing?.title ?? '',
    description: existing?.description ?? '',
    color: existing?.color ?? '',
    icon: existing?.icon ?? '',
    recurrence: (existing?.recurrence as QuestFormValues['recurrence'] | undefined) ?? 'daily',
    expiresInHours: existing?.expiresInHours ? String(existing.expiresInHours) : '',
    assignmentMode: existing?.assignmentMode ?? 'all_players',
    userIds: existing?.userIds ?? [],
    rewardRules: buildRuleFormEntries(categoryIds, toRuleFormValues(existing?.rewardRules)),
    penaltyRules: buildRuleFormEntries(categoryIds, toRuleFormValues(existing?.penaltyRules)),
  }
}

export function getRewardDefaultsFromReward(categoryIds: number[], existing?: AdminReward): RewardFormValues {
  return {
    title: existing?.title ?? '',
    description: existing?.description ?? '',
    color: existing?.color ?? '',
    icon: existing?.icon ?? '',
    cooldownDays: String(existing?.cooldownDays ?? 0),
    assignmentMode: existing?.assignmentMode ?? 'all_players',
    userIds: existing?.userIds ?? [],
    costs: buildRuleFormEntries(categoryIds, toRuleFormValues(existing?.costs)),
  }
}
