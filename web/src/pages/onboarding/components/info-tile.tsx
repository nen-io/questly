export function InfoTile({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="theme-shell-card rounded-[1.5rem] p-4">
      <p className="retro-ui text-xs uppercase tracking-[0.22em] text-primary">{title}</p>
      <p className="mt-3 text-3xl text-foreground">{value}</p>
      <p className="theme-shell-muted mt-2 text-sm leading-6">{detail}</p>
    </div>
  )
}
