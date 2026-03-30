import type { PublicContent } from './content'
import type { RefreshableAssetRef } from './media'
import type { ThemeConfig } from './common'
import type { OnboardingRouteStep, SetupState } from './onboarding'
import type { PointBalance } from './points'

export interface SessionUser {
  id: number
  realmId: number
  username: string
  displayName: string
  avatarUrl: string | null
  avatarAsset: RefreshableAssetRef | null
  email: string | null
  emailVerifiedAt: string | null
  role: 'admin' | 'player'
  mustChangePassword: boolean
  emailNotificationsEnabled: boolean
  inAppNotificationsEnabled: boolean
  tokenVersion: number
}

export interface PlatformPlayer {
  id: number
  username: string
  displayName: string
  role: 'admin' | 'player'
  status: string
  avatarUrl: string | null
  avatarAsset: RefreshableAssetRef | null
  online: boolean
}

export interface SessionData {
  user: SessionUser
  balances: PointBalance[]
  stats: {
    completedCount: number
    activeTasks: number
  }
  profile: {
    email: string | null
    emailVerifiedAt: string | null
    emailNotificationsEnabled: boolean
    inAppNotificationsEnabled: boolean
    unreadNotifications: number
  }
  platform: {
    platformName: string
    onboardingCompleted: boolean
    setup: SetupState
    content: PublicContent
    theme: ThemeConfig
    players: PlatformPlayer[]
    onboarding: {
      playerCount: number
      categoryCount: number
      needsSetup: boolean
      currentStep: OnboardingRouteStep
    }
  }
}
