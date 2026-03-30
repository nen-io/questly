import type { ActivityEvent } from '@/types/app'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ActivityFeedRow, EmptyState, ListSkeleton, PaginationBar } from '../components'

interface ActivitySectionProps {
  events: ActivityEvent[]
  isLoading: boolean
  page: number
  totalPages: number
  onOpenEvent: (event: ActivityEvent) => void
  onPageChange: (page: number) => void
}

export function ActivitySection({
  events,
  isLoading,
  page,
  totalPages,
  onOpenEvent,
  onPageChange,
}: ActivitySectionProps) {
  return (
    <Card className="rounded-[1.75rem]">
      <CardHeader>
        <CardTitle>Realm activity</CardTitle>
        <CardDescription>Every completion, comment, and catalog update lands here so the whole group can follow the momentum.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && events.length === 0 ? (
          <ListSkeleton rows={5} />
        ) : events.length > 0 ? (
          <>
            <div className="space-y-3">
              {events.map((event) => (
                <ActivityFeedRow key={event.id} event={event} onOpen={() => onOpenEvent(event)} />
              ))}
            </div>
            <PaginationBar
              page={page}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
          </>
        ) : (
          <EmptyState message="The activity feed will fill up as your group starts using the app." />
        )}
      </CardContent>
    </Card>
  )
}
