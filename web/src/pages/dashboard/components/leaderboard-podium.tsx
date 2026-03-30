import { motion } from 'framer-motion'
import { Crown, Medal } from 'lucide-react'

import type { LeaderboardEntry } from '@/types/app'

import { AvatarCircle } from './avatar-circle'
import { LeaderboardPointSnapshot } from './leaderboard-point-snapshot'

export function LeaderboardPodium({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return null
  }

  const order = [entries[1], entries[0], entries[2]].filter(Boolean) as LeaderboardEntry[]

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {order.map((entry) => (
        <motion.div
          key={entry.userId}
          layout
          className={`rounded-[1.5rem] border p-5 text-center shadow-sm ${
            entry.rank === 1 ? 'border-amber-300 bg-amber-50/70' : 'border-border/70 bg-card'
          }`}
          whileHover={{ y: -4, scale: 1.01 }}
        >
          <div className="mx-auto flex w-fit items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {entry.rank === 1 ? <Crown className="size-3.5 text-amber-500" /> : <Medal className="size-3.5" />}
            <span className="retro-numeric">Rank {entry.rank}</span>
          </div>
          <div className="mt-4 flex justify-center">
            <AvatarCircle
              avatarAsset={entry.avatarAsset}
              avatarUrl={entry.avatarUrl}
              name={entry.displayName}
              sizeClassName={entry.rank === 1 ? 'size-20' : 'size-16'}
              showIndicator={entry.online}
            />
          </div>
          <p className="mt-4 font-semibold">{entry.displayName}</p>
          <p className="retro-numeric mt-1 text-3xl font-semibold">{entry.totalPoints}</p>
          <p className="text-sm text-muted-foreground"><span className="retro-numeric">{entry.completedWins}</span> completed wins</p>
          <LeaderboardPointSnapshot className="mt-4 justify-center" entries={entry.pointSnapshot} />
        </motion.div>
      ))}
    </div>
  )
}
