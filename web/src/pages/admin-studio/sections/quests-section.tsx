import type { UseFormReturn } from 'react-hook-form'

import { EntityFormCard } from '@/components/admin-studio/entity-form-card'
import { ManageEntityListCard } from '@/components/admin-studio/manage-entity-list-card'
import { QuestEditorFields } from '@/components/admin-studio/quest-editor-fields'
import type { AdminCategory, AdminTask } from '@/types/app'
import { findCategoryName, type QuestFormValues } from '../utils'

export function AdminStudioQuestsSection({
  categories,
  players,
  questForm,
  questAssignmentMode,
  questSelectedUserIds,
  createQuestPending,
  editingTask,
  adminTasks,
  adminTasksLoading,
  questCatalogPage,
  questCatalogSearch,
  onSetQuestAssignmentMode,
  onToggleQuestUser,
  onCreateQuest,
  onQuestPageChange,
  onQuestSearchChange,
  onEditTask,
  onDeleteTask,
  onToggleTaskVisibility,
}: {
  categories: AdminCategory[]
  players: Array<{ id: number; displayName: string }>
  questForm: UseFormReturn<QuestFormValues>
  questAssignmentMode: 'all_players' | 'selected_players'
  questSelectedUserIds: number[]
  createQuestPending: boolean
  editingTask: AdminTask | null
  adminTasks?: { items: AdminTask[]; page: number; totalPages: number }
  adminTasksLoading: boolean
  questCatalogPage: number
  questCatalogSearch: string
  onSetQuestAssignmentMode: (mode: 'all_players' | 'selected_players') => void
  onToggleQuestUser: (userId: number) => void
  onCreateQuest: (values: QuestFormValues) => void
  onQuestPageChange: (page: number) => void
  onQuestSearchChange: (value: string) => void
  onEditTask: (task: AdminTask) => void
  onDeleteTask: (taskId: number) => void
  onToggleTaskVisibility: (task: AdminTask, nextActive: boolean) => void
}) {
  return (
    <div className="space-y-4">
      <EntityFormCard
        title="Create quest"
        description="Quests can reward or penalize any kudos track, and can be assigned to everyone or selected players."
        assignmentMode={questAssignmentMode}
        assignmentError={undefined}
        onAssignmentModeChange={onSetQuestAssignmentMode}
        selectedUserIds={questSelectedUserIds}
        onToggleUser={onToggleQuestUser}
        players={players}
        onSubmit={questForm.handleSubmit((values) => onCreateQuest(values))}
        submitDisabled={createQuestPending}
        submitLabel="Create quest"
      >
        <QuestEditorFields
          categories={categories}
          form={questForm}
          players={players}
        />
      </EntityFormCard>

      <ManageEntityListCard
        activeEditId={editingTask?.id ?? null}
        deleteDisabled={false}
        isLoading={adminTasksLoading}
        emptyMessage="No quests yet."
        items={(adminTasks?.items ?? []).map((task) => ({
          id: task.id,
          title: task.title,
          detail: `${task.recurrence} • ${task.assignmentMode === 'all_players' ? 'All players' : `${(task.userIds ?? []).length} selected`}`,
          color: task.color,
          icon: task.icon,
          isActive: task.isActive,
          meta: [
            ...(task.rewardRules ?? []).map((rule) => `+${rule.amount} ${findCategoryName(categories, rule.categoryId)}`),
            ...(task.penaltyRules ?? []).map((rule) => `-${rule.amount} ${findCategoryName(categories, rule.categoryId)}`),
          ],
        }))}
        page={adminTasks?.page ?? questCatalogPage}
        searchValue={questCatalogSearch}
        totalPages={adminTasks?.totalPages ?? 1}
        title="Quest catalog"
        onPageChange={onQuestPageChange}
        onSearchChange={onQuestSearchChange}
        onDelete={onDeleteTask}
        onEdit={(taskId) => {
          const task = adminTasks?.items.find((item) => item.id === taskId)
          if (task) {
            onEditTask(task)
          }
        }}
        onToggleVisibility={(taskId, nextActive) => {
          const task = adminTasks?.items.find((item) => item.id === taskId)
          if (task) {
            onToggleTaskVisibility(task, nextActive)
          }
        }}
      />
    </div>
  )
}
