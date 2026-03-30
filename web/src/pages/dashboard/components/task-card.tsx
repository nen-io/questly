import { motion } from 'framer-motion'

import type { PlayerTask } from '@/types/app'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { TaskRuleSummary } from './task-rule-summary'
import { formatCountdown } from '../utils/format-countdown'
import { formatDateTime } from '../utils/format-date-time'
import { formatTaskExpiryWindow } from '../utils/format-task-expiry-window'

export function TaskCard({
  now,
  task,
  onClick,
  onStart,
  onComplete,
}: {
  now: number
  task: PlayerTask
  onClick: () => void
  onStart: () => void
  onComplete: () => void
}) {
  const action = task.status === 'active'
    ? <Button onClick={onComplete}>Complete</Button>
    : task.status === 'available'
      ? <Button onClick={onStart}>Start</Button>
      : <Button disabled variant="secondary">Cooling down</Button>
  const accentStyle = task.color ? {
    backgroundImage: `linear-gradient(155deg, color-mix(in srgb, ${task.color} 14%, white), var(--card))`,
  } : undefined
  const statusLines = task.status === 'cooldown' && task.cooldownEndsAt
    ? [
        `Available again ${formatDateTime(task.cooldownEndsAt)}`,
        task.expiresInHours ? `Time limit ${formatTaskExpiryWindow(task.expiresInHours)} once started` : `Recurs ${task.recurrence}`,
      ]
    : task.status === 'active' && task.dueAt
      ? [`Expires in ${formatCountdown(task.dueAt, now)}`]
      : [
          task.expiresInHours ? `Time limit ${formatTaskExpiryWindow(task.expiresInHours)} once started` : 'No time limit once started',
          `Recurs ${task.recurrence}`,
        ]

  return (
    <motion.div
      layout
      className="relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-border/70 bg-card p-5 shadow-sm"
      style={accentStyle}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.995 }}
    >
      {task.color ? <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: task.color }} /> : null}
      <button type="button" className="w-full text-left" onClick={onClick}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/85 text-xl shadow-sm"
              style={task.color ? { boxShadow: `inset 0 0 0 2px ${task.color}` } : undefined}
            >
              <span className="emoji-glyph">{task.icon || '⚔️'}</span>
            </div>
            <div>
              <p className="font-semibold">{task.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{task.description || 'No description set yet.'}</p>
            </div>
          </div>
          <Badge variant={task.status === 'active' ? 'default' : 'secondary'}>{task.status}</Badge>
        </div>
        <div className="mt-4 space-y-2.5">
          <TaskRuleSummary rules={task.rewardRules} tone="positive" />
          <TaskRuleSummary rules={task.penaltyRules} tone="negative" />
        </div>
      </button>
      <div className="mt-auto flex flex-col gap-3 pt-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1 text-sm text-muted-foreground">
          {statusLines.map((line) => (
            <p key={`${task.id}-${line}`}>{line}</p>
          ))}
        </div>
        <div className="w-full sm:w-auto [&>button]:w-full sm:[&>button]:w-auto">{action}</div>
      </div>
    </motion.div>
  )
}
