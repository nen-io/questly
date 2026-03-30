import { dashboardTabPath, rewardDetailPath } from '@/routes/app'
import type { ActivityEvent } from '@/types/app'

import type { DashboardDestination } from './dashboard-destination'

const rewardDetailEventTypes = new Set(['reward_purchased', 'reward_redeemed'])

export function resolveActivityDestination(event: ActivityEvent): DashboardDestination {
  if ((event.type === 'quest_completed' || event.type === 'win_commented') && event.taskRunId) {
    return {
      kind: 'win',
      path: dashboardTabPath('wins'),
      runId: event.taskRunId,
    }
  }

  if (rewardDetailEventTypes.has(event.type) && event.rewardSlug) {
    return {
      kind: 'path',
      path: rewardDetailPath(event.rewardSlug),
    }
  }

  if (event.taskId) {
    return {
      kind: 'path',
      path: dashboardTabPath('tasks'),
    }
  }

  if (event.rewardId) {
    return {
      kind: 'path',
      path: dashboardTabPath('rewards'),
    }
  }

  return {
    kind: 'path',
    path: dashboardTabPath('activity'),
  }
}
