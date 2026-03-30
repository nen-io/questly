import toast from 'react-hot-toast'

import { ApiError } from '@/api/client'
import type { AdminBootstrap } from '@/types/app'

export type RuleFieldName = 'rewardRules' | 'penaltyRules' | 'costs'

export function handleMutationError(error: unknown) {
  const message = error instanceof ApiError ? error.message : 'Request failed'
  toast.error(message)
}

export function updateRuleValue(
  form: any,
  fieldName: RuleFieldName,
  categoryId: number,
  nextAmount: string,
) {
  const current = (form.getValues(fieldName) as Array<{ categoryId: number; amount: string }> | undefined) ?? []
  const nextValues = current.map((entry) => (
    entry.categoryId === categoryId
      ? { ...entry, amount: nextAmount }
      : entry
  ))

  form.setValue(fieldName, nextValues, {
    shouldDirty: true,
    shouldValidate: true,
  })
}

export function formatRuleMeta(
  categories: AdminBootstrap['categories'],
  categoryId: number,
  amount: number,
  prefix = '',
) {
  const category = categories.find((item) => item.id === categoryId)
  const label = category?.name || 'Kudos'
  return `${category?.icon || '•'} ${prefix}${amount} ${label}`
}
