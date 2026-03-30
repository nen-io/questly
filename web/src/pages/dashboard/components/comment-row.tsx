import { motion } from 'framer-motion'

import type { ActivityComment } from '@/types/app'

import { AvatarCircle } from './avatar-circle'
import { formatDateTime } from '../utils/format-date-time'

export function CommentRow({ comment }: { comment: ActivityComment }) {
  return (
    <motion.div layout className="rounded-2xl border border-border/70 p-4" whileHover={{ y: -2 }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <AvatarCircle
            avatarAsset={comment.authorAvatarAsset}
            avatarUrl={comment.authorAvatarUrl}
            name={comment.authorName}
            sizeClassName="size-9"
          />
          <div>
            <p className="font-medium">{comment.authorName}</p>
            <p className="text-xs text-muted-foreground">{formatDateTime(comment.createdAt)}</p>
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{comment.body}</p>
    </motion.div>
  )
}
