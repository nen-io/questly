import type { PointAttributeAmount } from './points'

export interface PlayerTask {
  id: number
  title: string
  slug: string
  description: string | null
  color: string | null
  icon: string | null
  recurrence: string
  assignmentMode: string
  expiresInHours: number | null
  status: 'available' | 'active' | 'cooldown'
  activeRunId: number | null
  dueAt: string | null
  cooldownEndsAt: string | null
  rewardRules: PointAttributeAmount[]
  penaltyRules: PointAttributeAmount[]
}

export interface RewardPurchase {
  id: number
  rewardId: number
  status: 'purchased' | 'redeemed'
  purchasedAt: string
  redeemedAt: string | null
  pointSnapshot: PointAttributeAmount[]
  rewardTitle?: string
}

export interface CompleteTaskResponse {
  success: true
  runId: number
  mediaProcessing: {
    status: 'none' | 'queued' | 'failed'
    queuedCount: number
    failedCount: number
  }
}

export interface QueueTaskRunMediaResponse {
  success: true
  queuedCount: number
  failedCount: number
}

export interface PlayerReward {
  id: number
  title: string
  slug: string
  description: string | null
  color: string | null
  icon: string | null
  assignmentMode: string
  cooldownDays: number
  isRedeemable: boolean
  status: 'available' | 'cooldown'
  cooldownEndsAt: string | null
  latestPurchase: RewardPurchase | null
  costs: Array<PointAttributeAmount & { rewardId: number }>
}

export interface TaskCatalogQuery {
  page?: number
  pageSize?: number
  search?: string
  categoryIds?: number[]
  collection?: 'active' | 'available'
}

export interface RewardCatalogQuery {
  page?: number
  pageSize?: number
  search?: string
  categoryIds?: number[]
  collection?: 'owned' | 'available'
}
