import { Input } from '@/components/ui/input'

import type { OnboardingCategory } from '../lib/types'

export function OnboardingRuleGrid({
  title,
  categories,
  error,
  tooltip,
  values,
  onChange,
}: {
  title: string
  categories: OnboardingCategory[]
  error?: string
  tooltip?: string
  values: Array<{ categoryId: number; amount: string }>
  onChange: (categoryId: number, value: string) => void
}) {
  return (
    <div className="space-y-3 rounded-[1.5rem] border border-white/80 bg-white/74 p-4 shadow-[0_12px_28px_rgba(83,31,52,0.06)]">
      <div className="space-y-1">
        <p className="retro-ui text-xs uppercase tracking-[0.24em] text-primary">{title}</p>
        {tooltip ? <p className="text-sm leading-6 text-foreground/70">{tooltip}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {categories.map((category) => (
          <div key={category.id} className="rounded-[1.25rem] border border-white/85 bg-white/88 p-3 shadow-[0_10px_20px_rgba(83,31,52,0.04)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/80 text-sm shadow-sm"
                  style={{ backgroundColor: category.color || 'var(--primary)', color: '#fff' }}
                >
                  {category.icon || '•'}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{category.name}</p>
                  <p className="text-sm text-foreground/60">{category.color || 'Theme accent'}</p>
                </div>
              </div>
            </div>
            <Input
              type="number"
              min="0"
              placeholder="Leave blank"
              value={values.find((entry) => entry.categoryId === category.id)?.amount ?? ''}
              onChange={(event) => onChange(category.id, event.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
