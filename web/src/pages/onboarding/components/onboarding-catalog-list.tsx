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
    <div className="theme-shell-card space-y-3 rounded-[1.5rem] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="retro-ui text-sm uppercase tracking-[0.22em] text-primary">{title}</p>
        <p className="theme-shell-soft text-sm">{items.length} total</p>
      </div>
      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="theme-shell-card-strong rounded-[1.3rem] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className="theme-shell-icon flex size-10 shrink-0 items-center justify-center rounded-full text-sm"
                    style={{ backgroundColor: item.color || 'var(--primary)', color: '#fff' }}
                  >
                    {item.icon || '•'}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{item.title}</p>
                    <p className="theme-shell-soft text-sm">{item.description}</p>
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
                    <span key={entry} className="theme-shell-chip rounded-full px-3 py-1 text-xs">
                      {entry}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="theme-shell-card rounded-2xl border-dashed border-primary/20 px-5 py-6 text-sm theme-shell-muted">{emptyMessage}</p>
      )}
    </div>
  )
}
