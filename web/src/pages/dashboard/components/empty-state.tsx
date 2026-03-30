import type { ReactNode } from 'react'

export function EmptyState({ message }: { message: ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}
