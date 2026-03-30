import { ChevronLeft } from 'lucide-react'

import type { PlayerTask } from '@/types/app'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { DetailRuleSection } from './detail-rule-section'
import { formatCountdown } from '../utils/format-countdown'
import { formatTaskExpiryWindow } from '../utils/format-task-expiry-window'

export function TaskDetailPanel({
  now,
  task,
  onBack,
  onStart,
  onComplete,
}: {
  now: number
  task: PlayerTask
  onBack: () => void
  onStart: () => void
  onComplete: () => void
}) {
  return (
    <Card className="overflow-hidden rounded-[1.9rem] border-border/70">
      <div
        className="border-b border-border/50 p-5 sm:p-8"
        style={task.color ? {
          backgroundImage: `linear-gradient(145deg, color-mix(in srgb, ${task.color} 22%, white), var(--surface-alt))`,
        } : undefined}
      >
        <Button type="button" variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-2 size-4" />
          Back to quests
        </Button>
        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{task.status}</Badge>
              <Badge variant="secondary">{task.recurrence}</Badge>
              {task.icon ? <Badge><span className="emoji-glyph">{task.icon}</span>&nbsp;Quest</Badge> : null}
            </div>
            <h2 className="text-3xl leading-tight sm:text-4xl">
              {task.icon ? <span className="emoji-glyph">{task.icon}</span> : null}
              {task.icon ? ' ' : ''}
              {task.title}
            </h2>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground">
              {task.description || 'No extra details were added for this quest yet.'}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/60 bg-white/70 p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="mt-1 text-xl font-semibold capitalize">{task.status}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {task.status === 'active' && task.dueAt
                ? `Expires in ${formatCountdown(task.dueAt, now)}`
                : task.status === 'cooldown' && task.cooldownEndsAt
                  ? `Available in ${formatCountdown(task.cooldownEndsAt, now)}`
                  : `Recurs ${task.recurrence}`}
            </p>
          </div>
        </div>
      </div>
      <CardContent className="grid gap-6 p-5 sm:p-8 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <DetailRuleSection title="Rewards" rules={task.rewardRules} positive />
          {task.penaltyRules.length > 0 ? <DetailRuleSection title="Penalties if it expires" rules={task.penaltyRules} /> : null}
        </div>
        <Card className="rounded-[1.5rem] border-border/70 bg-[var(--surface-alt)] shadow-none">
          <CardHeader>
            <CardTitle>Take action</CardTitle>
            <CardDescription>Start the quest when you are ready, or finish it once the task is done.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {task.status === 'active' ? (
              <Button className="w-full" onClick={onComplete}>Complete quest</Button>
            ) : task.status === 'available' ? (
              <Button className="w-full" onClick={onStart}>Start quest</Button>
            ) : (
              <Button className="w-full" disabled variant="secondary">Cooling down</Button>
            )}
            <div className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm text-muted-foreground">
              {task.expiresInHours
                ? `This quest gives players ${formatTaskExpiryWindow(task.expiresInHours)} to finish each active run.`
                : 'This quest stays active until you finish it.'}
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}
