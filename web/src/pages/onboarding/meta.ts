import type { OnboardingRouteStep } from '@/routes/app'

export const onboardingStepMeta: Array<{
  step: OnboardingRouteStep
  label: string
  shortLabel: string
  optional?: boolean
}> = [
  { step: 'identity', label: 'Identity + Surface', shortLabel: 'Identity' },
  { step: 'player', label: 'First Player', shortLabel: 'Player' },
  { step: 'attribute', label: 'First Kudos Track', shortLabel: 'Kudos' },
  { step: 'quest', label: 'First Quest', shortLabel: 'Quest', optional: true },
  { step: 'reward', label: 'First Reward', shortLabel: 'Reward', optional: true },
  { step: 'launch', label: 'Review + Launch', shortLabel: 'Launch' },
] as const
