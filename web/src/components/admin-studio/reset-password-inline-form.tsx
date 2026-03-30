import { useForm } from 'react-hook-form'
import type { z } from 'zod/v4'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { makeZodResolver } from '@/lib/zod-resolver'
import { resetPlayerPasswordFormSchema } from '@/schemas/forms'

export function ResetPasswordInlineForm({
  isPending,
  onSubmit,
}: {
  isPending: boolean
  onSubmit: (temporaryPassword: string) => Promise<unknown>
}) {
  const form = useForm<z.infer<typeof resetPlayerPasswordFormSchema>>({
    resolver: makeZodResolver(resetPlayerPasswordFormSchema),
    defaultValues: {
      temporaryPassword: '',
    },
  })

  return (
    <form
      className="mt-4 flex flex-col gap-3 md:flex-row"
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit(values.temporaryPassword)
        form.reset()
      })}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <Input
          type="password"
          placeholder="New temporary password"
          aria-invalid={Boolean(form.formState.errors.temporaryPassword)}
          {...form.register('temporaryPassword')}
        />
        {form.formState.errors.temporaryPassword?.message ? (
          <p className="text-sm text-destructive">{form.formState.errors.temporaryPassword.message}</p>
        ) : null}
      </div>
      <Button
        variant="secondary"
        disabled={isPending}
        type="submit"
      >
        Reset password
      </Button>
    </form>
  )
}
