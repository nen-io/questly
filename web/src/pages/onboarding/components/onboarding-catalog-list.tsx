import { Button } from '@/components/ui/button'

export function OnboardingCatalogList({
  title,
  items,
  emptyMessage,
  onEdit,
  onDelete,
  onToggleVisibility,
}: {
  title: string
  items: Array<{
    id: number
    title: string
    description: string
    color: string | null
    icon: string | null
    isActive: boolean
    meta: string[]
  }>
  emptyMessage: string
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  onToggleVisibility: (id: number, nextActive: boolean) => void
}) {
  return (
    <div className="space-y-3 rounded-[1.5rem] border border-white/80 bg-white/74 p-4 shadow-[0_12px_28px_rgba(83,31,52,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <p className="retro-ui text-sm uppercase tracking-[0.22em] text-primary">{title}</p>
        <p className="text-sm text-foreground/64">{items.length} total</p>
      </div>
      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-[1.3rem] border border-white/85 bg-white/88 p-4 shadow-[0_10px_20px_rgba(83,31,52,0.04)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/80 text-sm shadow-sm"
                    style={{ backgroundColor: item.color || 'var(--primary)', color: '#fff' }}
                  >
                    {item.icon || '•'}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{item.title}</p>
                    <p className="text-sm text-foreground/64">{item.description}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" type="button" variant="outline" onClick={() => onToggleVisibility(item.id, !item.isActive)}>
                    {item.isActive ? 'Hide' : 'Show'}
                  </Button>
                  <Button size="sm" type="button" variant="outline" onClick={() => onEdit(item.id)}>Edit</Button>
                  <Button size="sm" type="button" variant="outline" onClick={() => onDelete(item.id)}>Delete</Button>
                </div>
              </div>
              {item.meta.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.meta.map((entry) => (
                    <span key={entry} className="rounded-full border border-white/80 bg-white/72 px-3 py-1 text-xs text-foreground/72">
                      {entry}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-primary/20 bg-white/62 px-5 py-6 text-sm text-foreground/70">{emptyMessage}</p>
      )}
    </div>
  )
}
