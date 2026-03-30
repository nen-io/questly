import type { LeaderboardEntry } from '@/types/app'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { EmptyState } from './empty-state'
import { LeaderboardPodium } from './leaderboard-podium'
import { LeaderboardRow } from './leaderboard-row'
import { LeaderboardSkeleton } from './leaderboard-skeleton'
import { PaginationBar } from './pagination-bar'

export function LeaderboardPanel({
  title,
  description,
  entries,
  isLoading,
  page,
  totalPages,
  onPageChange,
}: {
  title: string
  description: string
  entries: LeaderboardEntry[]
  isLoading: boolean
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  return (
    <Card className="rounded-[1.75rem]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading && entries.length === 0 ? (
          <LeaderboardSkeleton />
        ) : entries.length > 0 ? (
          <>
            <LeaderboardPodium entries={entries.slice(0, 3)} />
            <div className="space-y-3">
              {entries.map((entry) => (
                <LeaderboardRow key={entry.userId} entry={entry} />
              ))}
            </div>
            <PaginationBar page={page} totalPages={totalPages} onPageChange={onPageChange} />
          </>
        ) : (
          <EmptyState message="The leaderboard will appear once multiple players join." />
        )}
      </CardContent>
    </Card>
  )
}
