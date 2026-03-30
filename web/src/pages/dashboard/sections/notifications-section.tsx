import type { NotificationItem } from '@/types/app'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, ListSkeleton, NotificationRow } from '../components'

interface NotificationsSectionProps {
  notifications: NotificationItem[]
  unreadCount: number
  isLoading: boolean
  isMarkingAllRead: boolean
  onMarkAllRead: () => void
  onOpenNotification: (notification: NotificationItem) => void
}

export function NotificationsSection({
  notifications,
  unreadCount,
  isLoading,
  isMarkingAllRead,
  onMarkAllRead,
  onOpenNotification,
}: NotificationsSectionProps) {
  return (
    <Card className="rounded-[1.75rem]">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Notification inbox</CardTitle>
            <CardDescription>In-game notifications for quest completions, catalog changes, and win comments.</CardDescription>
          </div>
          <Button
            disabled={isMarkingAllRead || unreadCount === 0}
            variant="outline"
            onClick={onMarkAllRead}
          >
            Mark all read
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && notifications.length === 0 ? (
          <ListSkeleton rows={4} />
        ) : notifications.length > 0 ? (
          notifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onOpen={() => onOpenNotification(notification)}
            />
          ))
        ) : (
          <EmptyState message="No notifications yet." />
        )}
      </CardContent>
    </Card>
  )
}
