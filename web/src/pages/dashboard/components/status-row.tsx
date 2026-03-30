export function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-[var(--surface-alt)] px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="retro-numeric font-medium">{value}</span>
    </div>
  )
}
