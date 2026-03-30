import { AttributePill } from './attribute-pill'

export function AttributePillList({
  entries,
  className = '',
  valueMode,
  valueKey = 'amount',
}: {
  entries: Array<{
    categoryId: number
    name: string
    color: string
    icon: string | null
    amount?: number
    balance?: number
  }>
  className?: string
  valueMode: 'plain' | 'positive' | 'negative' | 'signed'
  valueKey?: 'amount' | 'balance'
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`.trim()}>
      {entries.map((entry) => (
        <AttributePill
          key={`${entry.categoryId}-${valueKey}-${entry[valueKey] ?? 0}`}
          entry={entry}
          value={entry[valueKey] ?? 0}
          valueMode={valueMode}
        />
      ))}
    </div>
  )
}
