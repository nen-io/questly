import type { PublicContent } from './content'
import type { RefreshableAssetRef } from './media'
import type { ThemeConfig } from './common'
import type { OnboardingRouteStep, SetupState } from './onboarding'
import type { PointBalance, TaskRule } from './points'

export interface AdminPlayer {
  id: number
  username: string
  displayName: string
  role: string
  status: string
  mustChangePassword: boolean
  avatarUrl: string | null
  avatarAsset: RefreshableAssetRef | null
  online: boolean
  balances: PointBalance[]
}

export interface AdminCategory {
  id: number
  realmId: number
  slug: string
  name: string
  description: string | null
  color: string
  icon: string | null
  sortOrder: number
  isActive: boolean
}

export interface AdminTask {
  id: number
  title: string
  slug: string
  description: string | null
  color: string | null
  icon: string | null
  recurrence: string
  assignmentMode: 'all_players' | 'selected_players'
  expiresInHours: number | null
  isActive: boolean
  userIds: number[]
  rewardRules: TaskRule[]
  penaltyRules: TaskRule[]
}

export interface AdminReward {
  id: number
  title: string
  slug: string
  description: string | null
  color: string | null
  icon: string | null
  assignmentMode: 'all_players' | 'selected_players'
  cooldownDays: number
  isRedeemable: boolean
  isActive: boolean
  userIds: number[]
  costs: TaskRule[]
}

export interface AdminCatalogQuery {
  page?: number
  pageSize?: number
  search?: string
}

export interface AdminBootstrap {
  settings: {
    platformName: string
    onboardingCompleted: boolean
    content: PublicContent
    theme: ThemeConfig
  }
  setup: SetupState
  players: AdminPlayer[]
  categories: AdminCategory[]
  catalogCounts: {
    tasks: number
    rewards: number
  }
  themes: ThemeConfig[]
  onboarding: {
    playerCount: number
    categoryCount: number
    completed: boolean
    currentStep: OnboardingRouteStep
    needsSetup: boolean
  }
}
