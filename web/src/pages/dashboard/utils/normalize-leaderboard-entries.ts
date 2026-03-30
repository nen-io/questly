import type { LeaderboardEntry } from '@/types/app'

import { ensureArray } from './ensure-array'

export function normalizeLeaderboardEntries(entries: LeaderboardEntry[] | null | undefined) {
  return ensureArray(entries).map((entry) => ({
    ...entry,
    pointSnapshot: ensureArray(entry.pointSnapshot),
  }))
}
