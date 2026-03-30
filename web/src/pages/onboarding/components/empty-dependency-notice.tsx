export function EmptyDependencyNotice({ message }: { message: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-primary/20 bg-white/62 px-5 py-8 text-sm text-foreground/70">
      {message}
    </div>
  )
}
