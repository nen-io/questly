export function InfoTile({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/80 bg-white/74 p-4 shadow-[0_12px_28px_rgba(83,31,52,0.06)]">
      <p className="retro-ui text-xs uppercase tracking-[0.22em] text-primary">{title}</p>
      <p className="mt-3 text-3xl text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-6 text-foreground/72">{detail}</p>
    </div>
  )
}
