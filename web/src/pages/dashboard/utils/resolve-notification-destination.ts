import { dashboardTabPath } from '@/routes/app'
import type { NotificationItem } from '@/types/app'

import type { DashboardDestination } from './dashboard-destination'
import { getMetadataRecord, getPositiveInteger, normalizeInternalPath } from './dashboard-destination'

export function resolveNotificationDestination(notification: NotificationItem): DashboardDestination {
  const metadata = getMetadataRecord(notification.metadata)
  const runId = getPositiveInteger(metadata?.runId) ?? getPositiveInteger(metadata?.taskRunId)
  const path = normalizeInternalPath(notification.link)

  if ((notification.type === 'quest_completed' || notification.type === 'win_commented') && runId) {
    return {
      kind: 'win',
      path: path ?? dashboardTabPath('wins'),
      runId,
    }
  }

  return {
    kind: 'path',
    path: path ?? dashboardTabPath('notifications'),
  }
}
