import type { RefreshableAssetRef } from './media'
import type { OnboardingStep } from './onboarding'
import type { PlayerBalanceUpdate, PointRulePayload } from './points'

export interface LoginPayload {
  username: string
  password: string
}

export interface AdminAccessPayload {
  password: string
}

export interface ChangePasswordPayload {
  currentPassword?: string | null
  newPassword: string
  email?: string | null
  avatarDataUrl?: string | null
}

export interface UpdateEmailSettingsPayload {
  email: string | null
  emailNotificationsEnabled: boolean
  inAppNotificationsEnabled: boolean
}

export interface UpdateAvatarPayload {
  avatarDataUrl: string | null
}

export interface VerifyEmailPayload {
  token: string
}

export interface CreatePlayerPayload {
  username: string
  displayName: string
  temporaryPassword: string
}

export interface ResetPlayerPasswordPayload {
  temporaryPassword: string
}

export interface CreateCategoryPayload {
  name: string
  description?: string
  color?: string
  icon?: string
  sortOrder?: number
  isActive?: boolean
}

export interface UpdateCategoryAppearancePayload {
  name: string
  color?: string
  icon?: string
}

export interface UpdateSettingsPayload {
  platformName: string
  themePresetKey: string
  onboardingCompleted: boolean
  content: {
    fontPresetKey: string
    loginTitle: string
    loginMessage: string
    loginImageUrl: string | null
    loginBackgroundImageUrl: string | null
    loginBackgroundImageSource: string | null
    loginBackgroundVideoUrl: string | null
    loginBackgroundVideoSource: string | null
    dashboardTitle: string
    dashboardMessage: string
    onboardingIntroEyebrow: string
    onboardingIntroTitle: string
    onboardingIntroMessage: string
    onboardingLaunchTitle: string
    onboardingLaunchMessage: string
  }
}

export interface UpdateOnboardingStatePayload {
  currentStep?: OnboardingStep
  completedSteps?: OnboardingStep[]
  lastVisitedStep?: OnboardingStep
}

export interface CreateTaskPayload {
  title: string
  slug?: string
  description?: string
  color?: string
  icon?: string
  recurrence: 'daily' | 'weekly' | 'monthly' | 'one_time'
  assignmentMode: 'all_players' | 'selected_players'
  userIds: number[]
  rewardRules: PointRulePayload[]
  penaltyRules: PointRulePayload[]
  expiresInHours: number | null
  isActive?: boolean
}

export interface CreateRewardPayload {
  title: string
  slug?: string
  description?: string
  color?: string
  icon?: string
  assignmentMode: 'all_players' | 'selected_players'
  userIds: number[]
  costs: PointRulePayload[]
  cooldownDays: number
  isRedeemable?: boolean
  isActive?: boolean
}

export interface CompleteTaskPayload {
  notes?: string | null
}

export interface CreateActivityCommentPayload {
  body: string
}

export interface UpdatePlayerBalancesPayload {
  balances: PlayerBalanceUpdate[]
}

export interface RefreshAssetPayload {
  asset: RefreshableAssetRef
}

export interface UploadLoginBackgroundMediaResponse {
  mediaType: 'image' | 'video'
  source: string
  url: string
  asset: RefreshableAssetRef
}
