import type { PlayerTask, SessionData } from '@/types/app'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CardGridSkeleton,
  CatalogToolbar,
  EmptyState,
  PaginationBar,
  TaskCard,
  TaskDetailPanel,
} from '../components'

interface TasksSectionProps {
  detailSlug: string | null
  now: number
  pointTracks: SessionData['balances']
  taskSearch: string
  selectedTaskCategoryIds: number[]
  activeTasks: PlayerTask[]
  activeTasksIsLoading: boolean
  activeTasksPage: number
  activeTasksTotalPages: number
  availableTasks: PlayerTask[]
  availableTasksIsLoading: boolean
  availableTasksPage: number
  availableTasksTotalPages: number
  selectedTask: PlayerTask | null
  selectedTaskIsLoading: boolean
  onTaskSearchChange: (value: string) => void
  onTaskCategoryToggle: (categoryId: number) => void
  onClearFilters: () => void
  onBackFromDetail: () => void
  onOpenTask: (slug: string) => void
  onOpenCompletion: (task: PlayerTask) => void
  onStartTask: (taskId: number) => void
  onActivePageChange: (page: number) => void
  onAvailablePageChange: (page: number) => void
}

export function TasksSection({
  detailSlug,
  now,
  pointTracks,
  taskSearch,
  selectedTaskCategoryIds,
  activeTasks,
  activeTasksIsLoading,
  activeTasksPage,
  activeTasksTotalPages,
  availableTasks,
  availableTasksIsLoading,
  availableTasksPage,
  availableTasksTotalPages,
  selectedTask,
  selectedTaskIsLoading,
  onTaskSearchChange,
  onTaskCategoryToggle,
  onClearFilters,
  onBackFromDetail,
  onOpenTask,
  onOpenCompletion,
  onStartTask,
  onActivePageChange,
  onAvailablePageChange,
}: TasksSectionProps) {
  if (detailSlug && selectedTaskIsLoading) {
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

  if (selectedTask) {
    return (
      <TaskDetailPanel
        now={now}
        task={selectedTask}
        onBack={onBackFromDetail}
        onComplete={() => onOpenCompletion(selectedTask)}
        onStart={() => onStartTask(selectedTask.id)}
      />
    )
  }

  return (
    <div className="space-y-4">
      <CatalogToolbar
        categories={pointTracks}
        description="Search both active and available quests, then narrow the board to the kudos tracks you care about."
        searchPlaceholder="Search quests"
        selectedCategoryIds={selectedTaskCategoryIds}
        title="Quest board"
        value={taskSearch}
        onCategoryToggle={onTaskCategoryToggle}
        onClear={onClearFilters}
        onChange={onTaskSearchChange}
      />

      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Active quests</CardTitle>
          <CardDescription>These are currently in progress. If a quest has a deadline, the timer keeps counting down here.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {activeTasksIsLoading && activeTasks.length === 0 ? (
            <CardGridSkeleton />
          ) : activeTasks.length > 0 ? (
            activeTasks.map((task) => (
              <TaskCard
                key={task.id}
                now={now}
                task={task}
                onClick={() => onOpenTask(task.slug)}
                onComplete={() => onOpenCompletion(task)}
                onStart={() => onStartTask(task.id)}
              />
            ))
          ) : (
            <EmptyState message="No quests are active right now." />
          )}
        </CardContent>
        <CardContent className="pt-0">
          <PaginationBar
            compact
            page={activeTasksPage}
            totalPages={activeTasksTotalPages}
            onPageChange={onActivePageChange}
          />
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Available quests</CardTitle>
          <CardDescription>Pick a new quest to start, or check when a completed quest becomes available again.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {availableTasksIsLoading && availableTasks.length === 0 ? (
            <CardGridSkeleton />
          ) : availableTasks.length > 0 ? (
            availableTasks.map((task) => (
              <TaskCard
                key={task.id}
                now={now}
                task={task}
                onClick={() => onOpenTask(task.slug)}
                onComplete={() => onOpenCompletion(task)}
                onStart={() => onStartTask(task.id)}
              />
            ))
          ) : (
            <EmptyState message="No new quests are waiting right now." />
          )}
        </CardContent>
        <CardContent className="pt-0">
          <PaginationBar
            compact
            page={availableTasksPage}
            totalPages={availableTasksTotalPages}
            onPageChange={onAvailablePageChange}
          />
        </CardContent>
      </Card>
    </div>
  )
}
