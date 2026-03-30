import { motion } from 'framer-motion'
import { Activity } from 'lucide-react'

import type { ActivityEvent } from '@/types/app'

import { AvatarCircle } from './avatar-circle'
import { feedMeta } from '../meta/feed-meta'
import { formatDateTime } from '../utils/format-date-time'

export function ActivityFeedRow({
  event,
  onOpen,
}: {
  event: ActivityEvent
  onOpen: () => void
}) {
  const meta = feedMeta[event.type] || { icon: Activity, accent: 'bg-slate-100 text-slate-700' }
  const Icon = meta.icon

  return (
    <motion.button
      layout
      className="flex w-full gap-4 rounded-2xl border border-border/70 p-4 text-left transition hover:border-primary/35"
      type="button"
      whileHover={{ y: -2, scale: 1.005 }}
      whileTap={{ scale: 0.992 }}
      onClick={onOpen}
    >
      <div className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${meta.accent}`}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {event.actorName ? (
            <div className="flex items-center gap-2">
              <AvatarCircle
                avatarAsset={event.actorAvatarAsset}
                avatarUrl={event.actorAvatarUrl}
                name={event.actorName}
                sizeClassName="size-8"
              />
              <span className="text-sm font-medium">{event.actorName}</span>
            </div>
          ) : null}
          <span className="text-sm text-muted-foreground">{formatDateTime(event.createdAt)}</span>
        </div>
        <p className="mt-2 font-medium">{event.summary}</p>
        {typeof event.metadata?.commentBody === 'string' && event.metadata.commentBody.trim() ? (
          <p className="mt-2 rounded-2xl bg-[var(--surface-alt)] px-3 py-2 text-sm text-muted-foreground">
            {event.metadata.commentBody}
          </p>
        ) : null}
      </div>
    </motion.button>
  )
}
