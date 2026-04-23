import { motion, useReducedMotion } from 'framer-motion'
import { Gamepad2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

import { api } from '@/api/client'
import { FieldBlock } from '@/components/forms/field-block'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getFormErrorMessage } from '@/lib/form-errors'
import { makeZodResolver } from '@/lib/zod-resolver'
import { onboardingStepPath, toOnboardingRouteStep } from '@/routes/app'
import { adminAccessFormSchema } from '@/schemas/forms'
import type { PublicConfig } from '@/types/app'

import { handleMutationError } from '../lib/rules'

export function AdminAccessLanding({ publicConfig }: { publicConfig: PublicConfig }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const form = useForm({
    resolver: makeZodResolver(adminAccessFormSchema),
    defaultValues: { password: '' },
  })

  const adminAccessMutation = useMutation({
    mutationFn: api.adminAccess,
    onSuccess: async () => {
      form.reset()
      await queryClient.invalidateQueries({ queryKey: ['session'] })
      toast.success('Admin access granted')
      navigate(onboardingStepPath(toOnboardingRouteStep(publicConfig.setup.currentStep)), { replace: true })
    },
    onError: handleMutationError,
  })

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--primary)_18%,white),transparent_36%),radial-gradient(circle_at_bottom_right,color-mix(in_srgb,var(--accent)_18%,white),transparent_38%),linear-gradient(180deg,var(--surface),color-mix(in_srgb,var(--surface-alt)_84%,white))] text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(255,255,255,0.12)_49%,transparent_51%,transparent_100%)] bg-[length:100%_6px] opacity-20" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--foreground)_5%,transparent)_1px,transparent_1px),linear-gradient(0deg,color-mix(in_srgb,var(--foreground)_5%,transparent)_1px,transparent_1px)] bg-[length:24px_24px]" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <motion.section
          animate={{ opacity: 1, y: 0 }}
          className="theme-shell-panel relative w-full overflow-hidden rounded-[2.25rem] p-6 sm:p-8 lg:p-10"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.36, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.72),transparent_28%),radial-gradient(circle_at_bottom_left,color-mix(in_srgb,var(--primary)_12%,transparent),transparent_34%)]" />
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <Gamepad2 className="size-5" />
              </div>
              <div>
                <p className="retro-ui text-xs uppercase tracking-[0.3em] text-primary">Operator access only</p>
                <p className="theme-shell-muted text-sm font-medium">{publicConfig.platformName}</p>
              </div>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h1 className="max-w-[12ch] text-5xl leading-[0.92] text-foreground sm:text-6xl">
                    Boot the cabinet before the crowd gets in.
                  </h1>
                  <p className="theme-shell-muted max-w-3xl text-lg leading-8">
                    Wire the arena before the doors open. Set the rules, lock in accountability, and decide how competition should feel when your players hit the board.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    'Build the first roster, score tracks, quests, and rewards without letting anyone jump the queue.',
                    'This setup pass decides how progress is tracked, who gets called out, and what winning looks like.',
                    'Players stay benched until you finish the checks and release the cabinet.',
                  ].map((detail, index) => (
                    <div key={detail} className="theme-shell-card rounded-[1.6rem] p-4">
                      <p className="retro-ui text-xs uppercase tracking-[0.24em] text-primary">
                        {['Mission Brief', 'House Rules', 'Launch Lock'][index]}
                      </p>
                      <p className="theme-shell-muted mt-3 text-sm leading-7">{detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="theme-shell-card-strong rounded-[1.9rem] p-5">
                <p className="retro-ui text-xs uppercase tracking-[0.28em] text-primary">Operator Override</p>
                <h2 className="mt-3 text-3xl text-foreground">Enter the admin password and keep building.</h2>
                <p className="theme-shell-muted mt-3 text-base leading-7">
                  No spectators, no side doors, no early logins. The admin is the only one allowed into the cabinet before launch.
                </p>

                <form className="mt-6 space-y-5" onSubmit={form.handleSubmit((values) => adminAccessMutation.mutate(values))}>
                  <FieldBlock
                    error={getFormErrorMessage(form.formState.errors.password)}
                    htmlFor="adminAccessPassword"
                    label="Admin password"
                  >
                    <Input
                      id="adminAccessPassword"
                      type="password"
                      autoComplete="current-password"
                      className="theme-shell-input border-primary/25 placeholder:text-[color:var(--overlaySoft)]"
                      placeholder="Enter admin password"
                      aria-invalid={Boolean(form.formState.errors.password)}
                      {...form.register('password')}
                    />
                  </FieldBlock>
                  <Button className="h-12 w-full rounded-xl text-base" disabled={adminAccessMutation.isPending} type="submit">
                    {adminAccessMutation.isPending ? 'Unlocking cabinet...' : 'Unlock Setup Deck'}
                  </Button>
                  <p className="theme-shell-soft text-sm leading-6">
                    Competition stays queued until you launch the realm.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  )
}
