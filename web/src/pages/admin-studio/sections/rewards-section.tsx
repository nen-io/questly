import type { UseFormReturn } from 'react-hook-form'

import { EntityFormCard } from '@/components/admin-studio/entity-form-card'
import { ManageEntityListCard } from '@/components/admin-studio/manage-entity-list-card'
import { RewardEditorFields } from '@/components/admin-studio/reward-editor-fields'
import type { AdminCategory, AdminReward } from '@/types/app'
import { findCategoryName, type RewardFormValues } from '../utils'

export function AdminStudioRewardsSection({
  categories,
  players,
  rewardForm,
  rewardAssignmentMode,
  rewardSelectedUserIds,
  createRewardPending,
  editingReward,
  adminRewards,
  adminRewardsLoading,
  rewardCatalogPage,
  rewardCatalogSearch,
  onSetRewardAssignmentMode,
  onToggleRewardUser,
  onCreateReward,
  onRewardPageChange,
  onRewardSearchChange,
  onEditReward,
  onDeleteReward,
  onToggleRewardVisibility,
}: {
  categories: AdminCategory[]
  players: Array<{ id: number; displayName: string }>
  rewardForm: UseFormReturn<RewardFormValues>
  rewardAssignmentMode: 'all_players' | 'selected_players'
  rewardSelectedUserIds: number[]
  createRewardPending: boolean
  editingReward: AdminReward | null
  adminRewards?: { items: AdminReward[]; page: number; totalPages: number }
  adminRewardsLoading: boolean
  rewardCatalogPage: number
  rewardCatalogSearch: string
  onSetRewardAssignmentMode: (mode: 'all_players' | 'selected_players') => void
  onToggleRewardUser: (userId: number) => void
  onCreateReward: (values: RewardFormValues) => void
  onRewardPageChange: (page: number) => void
  onRewardSearchChange: (value: string) => void
  onEditReward: (reward: AdminReward) => void
  onDeleteReward: (rewardId: number) => void
  onToggleRewardVisibility: (reward: AdminReward, nextActive: boolean) => void
}) {
  return (
    <div className="space-y-4">
      <EntityFormCard
        title="Create reward"
        description="Rewards spend kudos totals and can be targeted to everyone or selected players."
        assignmentMode={rewardAssignmentMode}
        assignmentError={undefined}
        onAssignmentModeChange={onSetRewardAssignmentMode}
        selectedUserIds={rewardSelectedUserIds}
        onToggleUser={onToggleRewardUser}
        players={players}
        onSubmit={rewardForm.handleSubmit((values) => onCreateReward(values))}
        submitDisabled={createRewardPending}
        submitLabel="Create reward"
      >
        <RewardEditorFields
          categories={categories}
          form={rewardForm}
          players={players}
        />
      </EntityFormCard>

      <ManageEntityListCard
        activeEditId={editingReward?.id ?? null}
        deleteDisabled={false}
        isLoading={adminRewardsLoading}
        emptyMessage="No rewards yet."
        items={(adminRewards?.items ?? []).map((reward) => ({
          id: reward.id,
          title: reward.title,
          detail: `Cooldown ${reward.cooldownDays}d • ${reward.assignmentMode === 'all_players' ? 'All players' : `${(reward.userIds ?? []).length} selected`}`,
          color: reward.color,
          icon: reward.icon,
          isActive: reward.isActive,
          meta: (reward.costs ?? []).map((cost) => `${cost.amount} ${findCategoryName(categories, cost.categoryId)}`),
        }))}
        page={adminRewards?.page ?? rewardCatalogPage}
        searchValue={rewardCatalogSearch}
        totalPages={adminRewards?.totalPages ?? 1}
        title="Reward catalog"
        onPageChange={onRewardPageChange}
        onSearchChange={onRewardSearchChange}
        onDelete={onDeleteReward}
        onEdit={(rewardId) => {
          const reward = adminRewards?.items.find((item) => item.id === rewardId)
          if (reward) {
            onEditReward(reward)
          }
        }}
        onToggleVisibility={(rewardId, nextActive) => {
          const reward = adminRewards?.items.find((item) => item.id === rewardId)
          if (reward) {
            onToggleRewardVisibility(reward, nextActive)
          }
        }}
      />
    </div>
  )
}
