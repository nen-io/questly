import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod/v4'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { makeZodResolver } from '@/lib/zod-resolver'
import { buildBalanceFormEntries, updatePlayerBalancesFormSchema } from '@/schemas/forms'
import type { AdminBootstrap } from '@/types/app'

export function PlayerBalancesInlineForm({
  balances,
  isPending,
  onSubmit,
}: {
  balances: AdminBootstrap['players'][number]['balances'] | undefined
  isPending: boolean
  onSubmit: (balances: Array<{ categoryId: number; balance: string }>) => Promise<unknown>
}) {
  const safeBalances = useMemo(() => balances ?? [], [balances])
  const form = useForm<z.infer<typeof updatePlayerBalancesFormSchema>>({
    resolver: makeZodResolver(updatePlayerBalancesFormSchema),
    defaultValues: {
      balances: buildBalanceFormEntries(safeBalances),
    },
  })

  useEffect(() => {
    form.reset({
      balances: buildBalanceFormEntries(safeBalances),
    })
  }, [form, safeBalances])

  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit(values.balances)
      })}
    >
      <div className="space-y-1">
        <p className="text-sm font-medium">Player kudos</p>
        <p className="text-sm text-muted-foreground">Set the current total for each kudos track.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {safeBalances.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground md:col-span-2">
            Add a kudos track first to start tracking totals for this player.
          </div>
        ) : safeBalances.map((balance, index) => (
          <div key={balance.categoryId} className="rounded-2xl border border-border/70 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="font-medium">
                {balance.icon ? `${balance.icon} ` : ''}
                {balance.name}
              </span>
              <Badge style={{ backgroundColor: balance.color, color: '#ffffff' }}>{balance.balance}</Badge>
            </div>
            <Input
              type="number"
              min="0"
              aria-invalid={Boolean(form.formState.errors.balances?.[index]?.balance)}
              {...form.register(`balances.${index}.balance`)}
            />
            {form.formState.errors.balances?.[index]?.balance?.message ? (
              <p className="mt-2 text-sm text-destructive">{form.formState.errors.balances[index]?.balance?.message}</p>
            ) : null}
          </div>
        ))}
      </div>
      <Button type="submit" variant="secondary" disabled={isPending}>
        Save player points
      </Button>
    </form>
  )
}
