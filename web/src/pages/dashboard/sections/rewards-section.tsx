import type { PlayerReward, RewardPurchase, SessionData } from '@/types/app'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CardGridSkeleton,
  CatalogToolbar,
  EmptyState,
  ListSkeleton,
  PaginationBar,
  RewardCard,
  RewardDetailPanel,
} from '../components'
import { formatDateTime } from '../utils'

interface RewardsSectionProps {
  detailSlug: string | null
  now: number
  pointTracks: SessionData['balances']
  rewardSearch: string
  selectedRewardCategoryIds: number[]
  ownedRewards: PlayerReward[]
  ownedRewardsIsLoading: boolean
  ownedRewardsPage: number
  ownedRewardsTotalPages: number
  availableRewards: PlayerReward[]
  availableRewardsIsLoading: boolean
  availableRewardsPage: number
  availableRewardsTotalPages: number
  purchases: RewardPurchase[]
  purchasesIsLoading: boolean
  selectedReward: PlayerReward | null
  selectedRewardIsLoading: boolean
  onRewardSearchChange: (value: string) => void
  onRewardCategoryToggle: (categoryId: number) => void
  onClearFilters: () => void
  onBackFromDetail: () => void
  onOpenReward: (slug: string) => void
  onPurchaseReward: (rewardId: number) => void
  onRedeemReward: (purchaseId: number) => void
  onOwnedPageChange: (page: number) => void
  onAvailablePageChange: (page: number) => void
}

export function RewardsSection({
  detailSlug,
  now,
  pointTracks,
  rewardSearch,
  selectedRewardCategoryIds,
  ownedRewards,
  ownedRewardsIsLoading,
  ownedRewardsPage,
  ownedRewardsTotalPages,
  availableRewards,
  availableRewardsIsLoading,
  availableRewardsPage,
  availableRewardsTotalPages,
  purchases,
  purchasesIsLoading,
  selectedReward,
  selectedRewardIsLoading,
  onRewardSearchChange,
  onRewardCategoryToggle,
  onClearFilters,
  onBackFromDetail,
  onOpenReward,
  onPurchaseReward,
  onRedeemReward,
  onOwnedPageChange,
  onAvailablePageChange,
}: RewardsSectionProps) {
  if (detailSlug && selectedRewardIsLoading) {
    return (
      <Card className="rounded-[1.75rem]">
        <CardContent className="space-y-4 py-8">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-14 w-full max-w-3xl" />
          <Skeleton className="h-72 rounded-[1.5rem]" />
        </CardContent>
      </Card>
    )
  }

  if (selectedReward) {
    return (
      <RewardDetailPanel
        now={now}
        reward={selectedReward}
        onBack={onBackFromDetail}
        onPurchase={() => onPurchaseReward(selectedReward.id)}
        onRedeem={onRedeemReward}
      />
    )
  }

  return (
    <div className="space-y-4">
      <CatalogToolbar
        categories={pointTracks}
        description="Search both owned and available rewards, then focus on the kudos tracks you want to spend."
        searchPlaceholder="Search rewards"
        selectedCategoryIds={selectedRewardCategoryIds}
        title="Reward shop"
        value={rewardSearch}
        onCategoryToggle={onRewardCategoryToggle}
        onClear={onClearFilters}
        onChange={onRewardSearchChange}
      />

      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Your rewards</CardTitle>
          <CardDescription>Rewards you already picked up stay here until they are redeemed.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ownedRewardsIsLoading && ownedRewards.length === 0 ? (
            <CardGridSkeleton />
          ) : ownedRewards.length > 0 ? (
            ownedRewards.map((reward) => (
              <RewardCard
                key={reward.id}
                now={now}
                reward={reward}
                onClick={() => onOpenReward(reward.slug)}
                onPurchase={() => onPurchaseReward(reward.id)}
                onRedeem={onRedeemReward}
              />
            ))
          ) : (
            <EmptyState message="You have not picked up any rewards yet." />
          )}
        </CardContent>
        <CardContent className="pt-0">
          <PaginationBar
            compact
            page={ownedRewardsPage}
            totalPages={ownedRewardsTotalPages}
            onPageChange={onOwnedPageChange}
          />
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Available rewards</CardTitle>
          <CardDescription>Browse what you can spend now and what is still cooling down.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {availableRewardsIsLoading && availableRewards.length === 0 ? (
            <CardGridSkeleton />
          ) : availableRewards.length > 0 ? (
            availableRewards.map((reward) => (
              <RewardCard
                key={reward.id}
                now={now}
                reward={reward}
                onClick={() => onOpenReward(reward.slug)}
                onPurchase={() => onPurchaseReward(reward.id)}
                onRedeem={onRedeemReward}
              />
            ))
          ) : (
            <EmptyState message="No rewards are available yet." />
          )}
        </CardContent>
        <CardContent className="pt-0">
          <PaginationBar
            compact
            page={availableRewardsPage}
            totalPages={availableRewardsTotalPages}
            onPageChange={onAvailablePageChange}
          />
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Purchase history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {purchasesIsLoading && purchases.length === 0 ? (
            <ListSkeleton rows={3} />
          ) : purchases.length > 0 ? (
            purchases.map((purchase) => (
              <div key={purchase.id} className="rounded-2xl border border-border/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{purchase.rewardTitle || `Reward #${purchase.rewardId}`}</p>
                    <p className="text-sm text-muted-foreground">
                      Purchased {formatDateTime(purchase.purchasedAt)}
                    </p>
                  </div>
                  <Badge variant={purchase.status === 'redeemed' ? 'default' : 'secondary'}>
                    {purchase.status}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <EmptyState message="No reward purchases yet." />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
