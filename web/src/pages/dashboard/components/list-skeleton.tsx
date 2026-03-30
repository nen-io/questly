export function ListSkeleton({ rows }: { rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-border/70 p-4">
          <div className="h-5 w-40 animate-pulse rounded bg-muted/60" />
          <div className="mt-3 h-4 w-full animate-pulse rounded bg-muted/50" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-muted/50" />
        </div>
      ))}
    </>
  )
}
