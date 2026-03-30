import type { LeaderboardEntry, PlatformPlayer, SessionData } from '@/types/app'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AvatarCircle,
  EmptyState,
  LeaderboardPanel,
  PointBalanceCard,
  StatusRow,
} from '../components'

interface OverviewSectionProps {
  balances: SessionData['balances']
  isAdmin: boolean
  isSessionRefreshing: boolean
  onlinePlayers: PlatformPlayer[]
  playerCount: number
  activeTaskCount: number
  ownedRewardCount: number
  leaderboard: LeaderboardEntry[]
  leaderboardIsLoading: boolean
  leaderboardPage: number
  leaderboardTotalPages: number
  currentUserId: number
  topLeaderboardPlayer: LeaderboardEntry | null
  onLeaderboardPageChange: (page: number) => void
}

export function OverviewSection({
  balances,
  isAdmin,
  isSessionRefreshing,
  onlinePlayers,
  playerCount,
  activeTaskCount,
  ownedRewardCount,
  leaderboard,
  leaderboardIsLoading,
  leaderboardPage,
  leaderboardTotalPages,
  currentUserId,
  topLeaderboardPlayer,
  onLeaderboardPageChange,
}: OverviewSectionProps) {
  const hasLeaderboard = leaderboard.length > 1

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr_0.9fr]">
        <Card className="rounded-[1.75rem] xl:col-span-2">
          <CardHeader>
            <CardTitle>Point balances</CardTitle>
            <CardDescription>
              {isAdmin
                ? 'Admins do not collect kudos. Use the Admin page to review and adjust player totals.'
                : 'Your categories stay flexible, but the overview should still feel alive and easy to scan.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {balances.length > 0 ? (
              balances.map((balance, index) => (
                <PointBalanceCard
                  key={balance.categoryId}
                  balance={balance}
                  loading={isSessionRefreshing}
                  priority={index < 2}
                />
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-border/70 px-4 py-8 text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">
                {isAdmin
                  ? 'Game admins are excluded from scoring and the leaderboard.'
                  : 'No kudos totals are available yet.'}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-[1.75rem]">
            <CardHeader>
              <CardTitle>People online</CardTitle>
              <CardDescription>A quick pulse on who is around without taking over the whole page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {onlinePlayers.length > 0 ? (
                <>
                  {onlinePlayers.slice(0, 5).map((player) => (
                    <div key={player.id} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-[var(--surface-alt)] px-3 py-2">
                      <AvatarCircle
                        avatarAsset={player.avatarAsset}
                        avatarUrl={player.avatarUrl}
                        name={player.displayName}
                        showIndicator
                        sizeClassName="size-10"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {player.displayName}
                          {player.id === currentUserId ? ' (You)' : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">{player.role === 'admin' ? 'Admin' : 'Player'}</p>
                      </div>
                    </div>
                  ))}
                  {onlinePlayers.length > 5 && (
                    <p className="text-sm text-muted-foreground">+{onlinePlayers.length - 5} more online right now.</p>
                  )}
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                  Nobody else is online right now.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem]">
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatusRow label="Players" value={`${playerCount}`} />
              <StatusRow label="My active quests" value={`${activeTaskCount}`} />
              <StatusRow label="My rewards" value={`${ownedRewardCount}`} />
              <StatusRow label="Top rank" value={topLeaderboardPlayer ? topLeaderboardPlayer.displayName : 'Waiting for scores'} />
            </CardContent>
          </Card>
        </div>
      </div>

      {hasLeaderboard ? (
        <LeaderboardPanel
          description="Totals update live, and each player row now shows the kudos mix behind the rank."
          entries={leaderboard}
          isLoading={leaderboardIsLoading}
          page={leaderboardPage}
          title="Group ranking"
          totalPages={leaderboardTotalPages}
          onPageChange={onLeaderboardPageChange}
        />
      ) : (
        <EmptyState message="Add more players to unlock the shared ranking board." />
      )}
    </div>
  )
}
