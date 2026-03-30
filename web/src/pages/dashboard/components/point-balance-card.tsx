import { motion } from 'framer-motion'

import type { SessionData } from '@/types/app'
import { Badge } from '@/components/ui/badge'

export function PointBalanceCard({
  balance,
  loading,
  priority,
}: {
  balance: SessionData['balances'][number]
  loading: boolean
  priority: boolean
}) {
  return (
    <motion.div
      layout
      className={`relative overflow-hidden rounded-[1.5rem] border border-border/70 bg-card p-5 shadow-sm transition-transform ${
        loading ? 'scale-[0.99]' : 'scale-100'
      }`}
      style={{
        backgroundImage: `linear-gradient(160deg, color-mix(in srgb, ${balance.color} 20%, white), var(--surface-alt))`,
      }}
      whileHover={{ y: -4, scale: 1.01 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Kudos</p>
          <p className="mt-2 font-semibold">
            {balance.icon ? `${balance.icon} ${balance.name}` : balance.name}
          </p>
        </div>
        <Badge className="retro-numeric" style={{ backgroundColor: balance.color, color: '#ffffff' }}>{balance.balance}</Badge>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/60">
        <div
          className={`h-full rounded-full ${loading ? 'animate-pulse' : ''}`}
          style={{
            width: `${Math.max(22, Math.min(100, Math.abs(balance.balance) * 8 + (priority ? 16 : 8)))}%`,
            backgroundColor: balance.color,
          }}
        />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">Live kudos total for this player.</p>
      {loading ? <div className="pointer-events-none absolute inset-x-0 top-0 h-px animate-pulse bg-white/80" /> : null}
    </motion.div>
  )
}
