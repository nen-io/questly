import { AttributeIconBadge } from './attribute-icon-badge'
import { formatPointValue } from '../utils/format-point-value'

export function AttributePill({
  entry,
  value,
  valueMode,
}: {
  entry: {
    categoryId: number
    name: string
    color: string
    icon: string | null
  }
  value: number
  valueMode: 'plain' | 'positive' | 'negative' | 'signed'
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-full border border-border/70 px-2.5 py-1 text-xs shadow-sm"
      style={{ backgroundColor: `color-mix(in srgb, ${entry.color} 18%, white)` }}
    >
      <AttributeIconBadge color={entry.color} icon={entry.icon} />
      <span className="font-medium text-foreground/88">{entry.name}</span>
      <span className="retro-numeric text-foreground/72">{formatPointValue(value, valueMode)}</span>
    </div>
  )
}
