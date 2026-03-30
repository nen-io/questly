import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import type { AdminCategory } from '@/types/app'

export function RuleGrid({
  title,
  categories,
  error,
  tooltip,
  values,
  onChange,
}: {
  title: string
  categories: AdminCategory[]
  error?: string
  tooltip?: string
  values: Array<{ categoryId: number; amount: string }>
  onChange: (categoryId: number, value: string) => void
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
        {tooltip ? <p className="text-sm text-muted-foreground">{tooltip}</p> : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        {categories.map((category) => (
          <div key={category.id} className="rounded-2xl border border-border/70 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">{category.name}</span>
              <Badge variant="secondary">{category.icon || 'Attr'}</Badge>
            </div>
            <Input
              type="number"
              min="0"
              value={values.find((entry) => entry.categoryId === category.id)?.amount ?? ''}
              onChange={(event) => onChange(category.id, event.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
