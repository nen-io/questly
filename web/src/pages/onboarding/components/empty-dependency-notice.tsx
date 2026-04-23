export function EmptyDependencyNotice({ message }: { message: string }) {
  return (
    <div className="theme-shell-card rounded-[1.5rem] border-dashed border-primary/20 px-5 py-8 text-sm theme-shell-muted">
      {message}
    </div>
  )
}
