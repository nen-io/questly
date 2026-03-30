import { motion } from 'framer-motion'

import type { NotificationItem } from '@/types/app'
import { Badge } from '@/components/ui/badge'

import { formatDateTime } from '../utils/format-date-time'

export function NotificationRow({
  notification,
  onOpen,
}: {
  notification: NotificationItem
  onOpen: () => void
}) {
  return (
    <motion.button
      layout
      className={`w-full rounded-2xl border p-4 text-left transition ${
        notification.readAt ? 'border-border/70 bg-card' : 'border-primary/40 bg-primary/5'
      }`}
      type="button"
      whileHover={{ y: -2, scale: 1.005 }}
      whileTap={{ scale: 0.992 }}
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{notification.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
        </div>
        {!notification.readAt ? <Badge>New</Badge> : null}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{formatDateTime(notification.createdAt)}</p>
    </motion.button>
  )
}
