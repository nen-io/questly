import { motion } from 'framer-motion'

import type { PlayerReward } from '@/types/app'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { AttributePill } from './attribute-pill'
import { formatCountdown } from '../utils/format-countdown'

export function RewardCard({
  now,
  reward,
  onClick,
  onPurchase,
  onRedeem,
}: {
  now: number
  reward: PlayerReward
  onClick: () => void
  onPurchase: () => void
  onRedeem: (purchaseId: number) => void
}) {
  const purchase = reward.latestPurchase
  const action = purchase && purchase.status === 'purchased' && reward.isRedeemable
    ? <Button variant="secondary" onClick={() => onRedeem(purchase.id)}>Redeem</Button>
    : reward.status === 'available'
      ? <Button onClick={onPurchase}>Purchase</Button>
      : <Button disabled variant="secondary">Cooling down</Button>
  const accentStyle = reward.color ? {
    backgroundImage: `linear-gradient(155deg, color-mix(in srgb, ${reward.color} 14%, white), var(--card))`,
  } : undefined

  return (
    <motion.div
      layout
      className="relative overflow-hidden rounded-[1.5rem] border border-border/70 bg-card p-5 shadow-sm"
      style={accentStyle}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.995 }}
    >
      {reward.color ? <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: reward.color }} /> : null}
      <button type="button" className="w-full text-left" onClick={onClick}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/85 text-xl shadow-sm"
              style={reward.color ? { boxShadow: `inset 0 0 0 2px ${reward.color}` } : undefined}
            >
              <span className="emoji-glyph">{reward.icon || '🎁'}</span>
            </div>
            <div>
              <p className="font-semibold">{reward.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{reward.description || 'No description set yet.'}</p>
            </div>
          </div>
          <Badge variant={reward.status === 'available' ? 'secondary' : 'outline'}>{reward.status}</Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {reward.costs.map((cost) => (
            <AttributePill key={`${reward.id}-${cost.categoryId}`} entry={cost} value={cost.amount} valueMode="negative" />
          ))}
        </div>
      </button>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {reward.cooldownEndsAt
            ? `Ready in ${formatCountdown(reward.cooldownEndsAt, now)}`
            : `Cooldown ${reward.cooldownDays} day(s)`}
        </p>
        <div className="w-full sm:w-auto [&>button]:w-full sm:[&>button]:w-auto">{action}</div>
      </div>
    </motion.div>
  )
}
