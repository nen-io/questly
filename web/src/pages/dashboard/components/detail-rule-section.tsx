import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { AttributeIconBadge } from './attribute-icon-badge'
import { formatPointValue } from '../utils/format-point-value'

export function DetailRuleSection({
  title,
  rules,
  positive = false,
}: {
  title: string
  rules: Array<{ categoryId: number; name: string; amount: number; color: string; icon: string | null }>
  positive?: boolean
}) {
  return (
    <Card className="rounded-[1.5rem] border-border/70 shadow-none">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {rules.length > 0 ? rules.map((rule) => (
          <div
            key={`${title}-${rule.categoryId}`}
            className="rounded-2xl border border-border/70 px-4 py-3"
            style={{ backgroundColor: `color-mix(in srgb, ${rule.color} 14%, white)` }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <AttributeIconBadge color={rule.color} icon={rule.icon} />
                <p className="truncate text-sm font-medium text-foreground">{rule.name}</p>
              </div>
              <p className="retro-numeric text-lg font-semibold text-foreground">
                {formatPointValue(rule.amount, positive ? 'positive' : 'plain')}
              </p>
            </div>
          </div>
        )) : (
          <div className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground sm:col-span-2">
            Nothing set here yet.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
