import type { LeaderboardEntry } from '@/types/app'

import { AttributePillList } from './attribute-pill-list'
import { ensureArray } from '../utils/ensure-array'

export function LeaderboardPointSnapshot({
  entries,
  className = '',
}: {
  entries: LeaderboardEntry['pointSnapshot'] | null | undefined
  className?: string
}) {
  // Old cached leaderboard responses may not have the newer pointSnapshot field yet.
  // Normalize here so schema additions do not crash the dashboard during rollout.
  const safeEntries = ensureArray(entries)

  if (safeEntries.length === 0) {
    return <p className={`text-xs text-muted-foreground ${className}`}>No tracked kudos yet.</p>
  }

  return (
    <AttributePillList className={className} entries={safeEntries.slice(0, 6)} valueKey="balance" valueMode="plain" />
  )
}
