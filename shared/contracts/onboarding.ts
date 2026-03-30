import type { PublicContent } from './content'
import type { ThemeConfig } from './common'

export type OnboardingStatus = 'not_started' | 'in_progress' | 'launched'

export const onboardingSteps = ['identity', 'player', 'attribute', 'quest', 'reward', 'launch'] as const

export type OnboardingRouteStep = typeof onboardingSteps[number]
export type OnboardingStep = OnboardingRouteStep | 'landing'

export const firstOnboardingStep: OnboardingRouteStep = onboardingSteps[0]

export interface LaunchRequirements {
  identityConfigured: boolean
  landingConfigured: boolean
  hasPlayer: boolean
  hasAttribute: boolean
}

export interface SetupState {
  status: OnboardingStatus
  currentStep: OnboardingRouteStep
  completedSteps: OnboardingRouteStep[]
  lastVisitedStep: OnboardingRouteStep
  launchedAt: string | null
  isLaunched: boolean
  allowPlayerLogin: boolean
  launchBlockers: string[]
  requirements: LaunchRequirements
}

export interface PublicConfig {
  realm: {
    id: number
    name: string
    slug: string
  }
  platformName: string
  onboardingCompleted: boolean
  setup: SetupState
  content: PublicContent
  theme: ThemeConfig
}

export function isOnboardingRouteStep(value: string | null | undefined): value is OnboardingRouteStep {
  return Boolean(value) && onboardingSteps.includes(value as OnboardingRouteStep)
}

export function isOnboardingStep(value: string | null | undefined): value is OnboardingStep {
  return value === 'landing' || isOnboardingRouteStep(value)
}

export function normalizeOnboardingStep(value: string | null | undefined): OnboardingRouteStep {
  if (value === 'landing' || value === 'intro' || !value) {
    return firstOnboardingStep
  }

  return isOnboardingRouteStep(value) ? value : firstOnboardingStep
}
