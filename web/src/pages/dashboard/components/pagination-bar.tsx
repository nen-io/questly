import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function PaginationBar({
  page,
  totalPages,
  onPageChange,
  compact = false,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  compact?: boolean
}) {
  if (totalPages <= 1) {
    return null
  }

  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${compact ? 'pt-1' : 'pt-2'}`}>
      <Button disabled={page <= 1} size={compact ? 'sm' : 'default'} variant="outline" onClick={() => onPageChange(page - 1)}>
        <ChevronLeft className="mr-1 size-4" />
        Previous
      </Button>
      <p className="text-sm text-muted-foreground"><span className="retro-numeric">Page {page} of {totalPages}</span></p>
      <Button disabled={page >= totalPages} size={compact ? 'sm' : 'default'} variant="outline" onClick={() => onPageChange(page + 1)}>
        Next
        <ChevronRight className="ml-1 size-4" />
      </Button>
    </div>
  )
}
