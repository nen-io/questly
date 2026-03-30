import { motion } from 'framer-motion'

import type { LeaderboardEntry } from '@/types/app'
import { Badge } from '@/components/ui/badge'

import { AvatarCircle } from './avatar-circle'
import { LeaderboardPointSnapshot } from './leaderboard-point-snapshot'

export function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <motion.div
      layout
      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${entry.isCurrentUser ? 'border-primary/40 bg-primary/5' : 'border-border/70'}`}
      whileHover={{ x: 2, y: -2 }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="retro-numeric flex size-9 items-center justify-center rounded-full bg-[var(--surface-alt)] text-sm font-semibold text-muted-foreground">
          {entry.rank}
        </div>
        <AvatarCircle
          avatarAsset={entry.avatarAsset}
          avatarUrl={entry.avatarUrl}
          name={entry.displayName}
          sizeClassName="size-11"
          showIndicator={entry.online}
        />
        <div className="min-w-0">
          <p className="truncate font-medium">
            {entry.displayName}
            {entry.isCurrentUser ? ' (You)' : ''}
          </p>
          <p className="text-sm text-muted-foreground"><span className="retro-numeric">{entry.completedWins}</span> completed wins</p>
          <LeaderboardPointSnapshot className="mt-2" entries={entry.pointSnapshot} />
        </div>
      </div>
      <Badge className="retro-numeric" variant="secondary">{entry.totalPoints} pts</Badge>
    </motion.div>
  )
}
