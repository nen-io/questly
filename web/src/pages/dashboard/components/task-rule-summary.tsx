import { CircleMinus, CirclePlus } from 'lucide-react'

import { cn } from '@/lib/utils'

import { AttributePill } from './attribute-pill'

interface TaskRuleSummaryProps {
  rules: Array<{
    amount: number
    categoryId: number
    color: string
    icon: string | null
    name: string
  }>
  tone: 'positive' | 'negative'
}

const toneCopy = {
  negative: {
    badgeClassName: 'border-rose-200/90 bg-rose-50 text-rose-700',
    containerClassName: 'border-rose-200/80 bg-rose-50/35',
    Icon: CircleMinus,
    title: 'Penalty if missed',
  },
  positive: {
    badgeClassName: 'border-emerald-200/90 bg-emerald-50 text-emerald-700',
    containerClassName: 'border-emerald-200/80 bg-emerald-50/35',
    Icon: CirclePlus,
    title: 'Reward on completion',
  },
} as const

export function TaskRuleSummary({ rules, tone }: TaskRuleSummaryProps) {
  if (rules.length === 0) {
    return null
  }

  const { badgeClassName, containerClassName, Icon, title } = toneCopy[tone]

  return (
    <div className={cn('rounded-[1.2rem] border px-3 py-3', containerClassName)}>
      <div
        className={cn(
          'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]',
          badgeClassName,
        )}
      >
        <Icon className="size-3.5 shrink-0" />
        <span>{title}</span>
      </div>
      <div className="mt-3 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2 pr-1">
          {rules.map((rule) => (
            <div key={`${tone}-${rule.categoryId}`} className="shrink-0">
              <AttributePill
                entry={rule}
                value={rule.amount}
                valueMode={tone}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
