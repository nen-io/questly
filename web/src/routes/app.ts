import {
  isOnboardingRouteStep,
  normalizeOnboardingStep,
  onboardingSteps as sharedOnboardingSteps,
  type OnboardingRouteStep,
} from '@shared/contracts'
export type { OnboardingRouteStep } from '@shared/contracts'

export const dashboardTabs = [
  'overview',
  'tasks',
  'rewards',
  'leaderboard',
  'wins',
  'activity',
  'notifications',
  'settings',
  'admin',
] as const

export type DashboardTab = typeof dashboardTabs[number]

export const adminSections = ['players', 'categories', 'branding', 'quests', 'rewards'] as const

export type AdminSection = typeof adminSections[number]

export const onboardingSteps = [...sharedOnboardingSteps]

const dashboardSegments: Record<Exclude<DashboardTab, 'admin'>, string> = {
  overview: 'overview',
  tasks: 'quests',
  rewards: 'rewards',
  leaderboard: 'leaderboard',
  wins: 'wins',
  activity: 'activity',
  notifications: 'notifications',
  settings: 'settings',
}

const segmentToDashboardTab = Object.entries(dashboardSegments).reduce<Record<string, Exclude<DashboardTab, 'admin'>>>(
  (accumulator, [tab, segment]) => {
    accumulator[segment] = tab as Exclude<DashboardTab, 'admin'>
    return accumulator
  },
  {},
)

export function isAdminSection(value: string | null | undefined): value is AdminSection {
  return Boolean(value) && adminSections.includes(value as AdminSection)
}

export function isDashboardTab(value: string | null | undefined): value is DashboardTab {
  return Boolean(value) && dashboardTabs.includes(value as DashboardTab)
}

export function dashboardTabPath(tab: Exclude<DashboardTab, 'admin'>) {
  return `/app/${dashboardSegments[tab]}`
}

export function taskDetailPath(slug: string) {
  return `/app/quests/${slug}`
}

export function rewardDetailPath(slug: string) {
  return `/app/rewards/${slug}`
}

export function adminSectionPath(section: AdminSection) {
  return `/app/admin/${section}`
}

export function isOnboardingStep(value: string | null | undefined): value is OnboardingRouteStep {
  return isOnboardingRouteStep(value)
}

export function toOnboardingRouteStep(value: string | null | undefined): OnboardingRouteStep {
  return normalizeOnboardingStep(value)
}

export function onboardingStepPath(step: OnboardingRouteStep) {
  return `/setup/onboarding/${step}`
}

export function getDefaultAppPath({
  role,
  needsSetup,
  onboardingStep,
}: {
  role: 'admin' | 'player'
  needsSetup: boolean
  onboardingStep?: string
}) {
  if (role === 'admin' && needsSetup) {
    return onboardingStepPath(toOnboardingRouteStep(onboardingStep))
  }

  return dashboardTabPath('overview')
}

export function resolveDashboardRoute({
  pathname,
  hasLeaderboard: _hasLeaderboard,
  isAdmin,
}: {
  pathname: string
  hasLeaderboard: boolean
  isAdmin: boolean
}): {
  adminSection: AdminSection | null
  canonicalPath: string
  detailSlug: string | null
  tab: DashboardTab
} {
  const [appSegment, pageSegment, sectionSegment] = pathname.split('/').filter(Boolean)

  if (appSegment !== 'app') {
    return {
      adminSection: null,
      canonicalPath: dashboardTabPath('overview'),
      detailSlug: null,
      tab: 'overview',
    }
  }

  if (pageSegment === 'admin') {
    if (!isAdmin) {
      return {
        adminSection: null,
        canonicalPath: dashboardTabPath('overview'),
        detailSlug: null,
        tab: 'overview',
      }
    }

    const adminSection = isAdminSection(sectionSegment) ? sectionSegment : 'players'

    return {
      adminSection,
      canonicalPath: adminSectionPath(adminSection),
      detailSlug: null,
      tab: 'admin',
    }
  }

  const tab = segmentToDashboardTab[pageSegment ?? 'overview']

  if (!tab) {
    return {
      adminSection: null,
      canonicalPath: dashboardTabPath('overview'),
      detailSlug: null,
      tab: 'overview',
    }
  }

  if (tab === 'leaderboard') {
    return {
      adminSection: null,
      canonicalPath: dashboardTabPath('overview'),
      detailSlug: null,
      tab: 'overview',
    }
  }

  if (isAdmin && (tab === 'tasks' || tab === 'rewards')) {
    return {
      adminSection: tab === 'tasks' ? 'quests' : 'rewards',
      canonicalPath: adminSectionPath(tab === 'tasks' ? 'quests' : 'rewards'),
      detailSlug: null,
      tab: 'admin',
    }
  }

  return {
    adminSection: null,
    canonicalPath: tab === 'tasks' && sectionSegment
      ? taskDetailPath(sectionSegment)
      : tab === 'rewards' && sectionSegment
        ? rewardDetailPath(sectionSegment)
        : dashboardTabPath(tab),
    detailSlug: tab === 'tasks' || tab === 'rewards' ? sectionSegment ?? null : null,
    tab,
  }
}
