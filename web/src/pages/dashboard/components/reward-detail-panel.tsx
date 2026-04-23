import { ChevronLeft } from 'lucide-react'

import type { PlayerReward } from '@/types/app'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { DetailRuleSection } from './detail-rule-section'
import { formatCountdown } from '../utils/format-countdown'
import { formatDateTime } from '../utils/format-date-time'

export function RewardDetailPanel({
  now,
  reward,
  onBack,
  onPurchase,
  onRedeem,
}: {
  now: number
  reward: PlayerReward
  onBack: () => void
  onPurchase: () => void
  onRedeem: (purchaseId: number) => void
}) {
  const purchase = reward.latestPurchase

  return (
    <Card className="overflow-hidden rounded-[1.9rem] border-border/70">
      <div
        className="border-b border-border/50 p-5 sm:p-8"
        style={reward.color ? {
          backgroundImage: `linear-gradient(145deg, color-mix(in srgb, ${reward.color} 22%, white), var(--surface-alt))`,
        } : undefined}
      >
        <Button type="button" variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-2 size-4" />
          Back to rewards
        </Button>
        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{reward.status}</Badge>
              {reward.icon ? <Badge><span className="emoji-glyph">{reward.icon}</span>&nbsp;Reward</Badge> : null}
            </div>
            <h2 className="text-3xl leading-tight sm:text-4xl">
              {reward.icon ? <span className="emoji-glyph">{reward.icon}</span> : null}
              {reward.icon ? ' ' : ''}
              {reward.title}
            </h2>
            <p className="theme-shell-muted max-w-3xl text-base leading-7">
              {reward.description || 'No extra details were added for this reward yet.'}
            </p>
          </div>
          <div className="theme-shell-card rounded-[1.5rem] p-4">
            <p className="theme-shell-muted text-sm">Availability</p>
            <p className="mt-1 text-xl font-semibold capitalize">{reward.status}</p>
            <p className="theme-shell-muted mt-2 text-sm">
              {reward.cooldownEndsAt
                ? `Ready in ${formatCountdown(reward.cooldownEndsAt, now)}`
                : `Cooldown ${reward.cooldownDays} day(s)`}
            </p>
          </div>
        </div>
      </div>
      <CardContent className="grid gap-6 p-5 sm:p-8 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <DetailRuleSection title="Cost" rules={reward.costs} />
          {purchase ? (
            <Card className="rounded-[1.5rem] border-border/70 shadow-none">
              <CardHeader>
                <CardTitle>Latest reward status</CardTitle>
              </CardHeader>
              <CardContent className="theme-shell-muted space-y-2 text-sm">
                <p>Purchased {formatDateTime(purchase.purchasedAt)}</p>
                <p>Status: {purchase.status}</p>
                {purchase.redeemedAt ? <p>Redeemed {formatDateTime(purchase.redeemedAt)}</p> : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
        <Card className="rounded-[1.5rem] border-border/70 bg-[var(--surface-alt)] shadow-none">
          <CardHeader>
            <CardTitle>Take action</CardTitle>
            <CardDescription>Buy the reward now, or redeem it later if you already unlocked it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {purchase && purchase.status === 'purchased' && reward.isRedeemable ? (
              <Button className="w-full" variant="secondary" onClick={() => onRedeem(purchase.id)}>Redeem reward</Button>
            ) : reward.status === 'available' ? (
              <Button className="w-full" onClick={onPurchase}>Buy reward</Button>
            ) : (
              <Button className="w-full" disabled variant="secondary">Cooling down</Button>
            )}
            <div className="theme-shell-card rounded-2xl px-4 py-3 text-sm theme-shell-muted">
              Costs are taken immediately when you buy the reward.
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}
