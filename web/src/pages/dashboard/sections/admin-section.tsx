import type { AdminBootstrap } from '@/types/app'
import type { AdminSection } from '@/routes/app'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AdminStudio } from '@/pages/admin-studio'

interface AdminSectionProps {
  bootstrap: AdminBootstrap | undefined
  activeSection: AdminSection | null
  focusedRewardId?: number | null
  focusedRewardSearch?: string
  isLoading: boolean
  onFocusedRewardHandled?: () => void
  onSectionChange: (section: AdminSection) => void
}

export function AdminSectionView({
  bootstrap,
  activeSection,
  focusedRewardId,
  focusedRewardSearch,
  isLoading,
  onFocusedRewardHandled,
  onSectionChange,
}: AdminSectionProps) {
  if (isLoading && !bootstrap) {
    return (
      <Card className="rounded-[1.75rem]">
        <CardContent className="space-y-4 py-8">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-full max-w-2xl" />
          <Skeleton className="h-48 rounded-[1.5rem]" />
        </CardContent>
      </Card>
    )
  }

  if (bootstrap) {
    return (
      <AdminStudio
        activeSection={activeSection ?? 'players'}
        bootstrap={bootstrap}
        focusedRewardId={focusedRewardId}
        focusedRewardSearch={focusedRewardSearch}
        onFocusedRewardHandled={onFocusedRewardHandled}
        onSectionChange={onSectionChange}
      />
    )
  }

  return (
    <Card className="rounded-[1.75rem]">
      <CardContent className="py-10 text-center text-muted-foreground">
        Loading admin workspace...
      </CardContent>
    </Card>
  )
}
