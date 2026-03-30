import { Skeleton } from '@/components/ui/skeleton'

import { ListSkeleton } from './list-skeleton'

export function LeaderboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Skeleton className="h-56 rounded-[1.5rem]" />
        <Skeleton className="h-64 rounded-[1.5rem]" />
        <Skeleton className="h-56 rounded-[1.5rem]" />
      </div>
      <ListSkeleton rows={4} />
    </div>
  )
}
