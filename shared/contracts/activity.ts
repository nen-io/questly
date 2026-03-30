import type { PointAttributeAmount, PointAttributeDisplay } from './points'
import type { RefreshableAssetRef } from './media'

export interface NotificationItem {
  id: number
  realmId: number
  recipientUserId: number
  actorUserId: number | null
  type: string
  title: string
  body: string
  link: string | null
  metadata: Record<string, unknown> | null
  readAt: string | null
  emailStatus: string
  emailedAt: string | null
  emailError: string | null
  createdAt: string
}

export interface ActivityMediaItem {
  id: number
  mediaType: 'image' | 'video'
  mimeType: string
  originalName: string | null
  sizeBytes: number | null
  fullUrl: string
  fullAsset: RefreshableAssetRef
  thumbnailUrl: string
  thumbnailAsset: RefreshableAssetRef
  thumbnailMimeType: string
}

export interface ActivityRun {
  id: number
  taskId: number
  taskTitle: string
  userId: number
  playerName: string
  playerAvatarUrl: string | null
  playerAvatarAsset: RefreshableAssetRef | null
  notes: string | null
  resolvedAt: string | null
  pointSnapshot: PointAttributeAmount[] | null
  previewMedia: ActivityMediaItem[]
  mediaCount: number
  pendingMediaCount: number
}

export interface ActivityComment {
  id: number
  taskRunId: number
  userId: number
  authorName: string
  authorAvatarUrl: string | null
  authorAvatarAsset: RefreshableAssetRef | null
  body: string
  createdAt: string
}

export interface LeaderboardEntry {
  rank: number
  userId: number
  displayName: string
  avatarUrl: string | null
  avatarAsset: RefreshableAssetRef | null
  online: boolean
  totalPoints: number
  completedWins: number
  isCurrentUser: boolean
  pointSnapshot: Array<PointAttributeDisplay & { balance: number }>
}

export interface ActivityEvent {
  id: number
  type: string
  summary: string
  actorUserId: number | null
  actorName: string | null
  actorAvatarUrl: string | null
  actorAvatarAsset: RefreshableAssetRef | null
  subjectUserId: number | null
  subjectName: string | null
  subjectAvatarUrl: string | null
  subjectAvatarAsset: RefreshableAssetRef | null
  taskId: number | null
  taskTitle: string | null
  taskSlug: string | null
  taskRunId: number | null
  rewardId: number | null
  rewardTitle: string | null
  rewardSlug: string | null
  commentId: number | null
  metadata: Record<string, unknown> | null
  createdAt: string
}
