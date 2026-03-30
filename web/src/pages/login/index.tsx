import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import { LockKeyhole } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

import { FieldBlock } from '@/components/forms/field-block'
import { ThemeAtmosphere } from '@/components/theme/theme-atmosphere'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { BaseModalBody, BaseModalContent, BaseModalHeader } from '@/components/ui/base-modal'
import { Input } from '@/components/ui/input'
import { getFormErrorMessage } from '@/lib/form-errors'
import { makeZodResolver } from '@/lib/zod-resolver'
import { api, ApiError } from '@/api/client'
import { loginFormSchema } from '@/schemas/forms'
import type { PublicConfig } from '@/types/app'
import { LoginHeroPanel } from './components/login-hero-panel'

interface LoginScreenProps {
  publicConfig: PublicConfig
  preview?: boolean
}

export function LoginScreen({ publicConfig, preview = false }: LoginScreenProps) {
  const queryClient = useQueryClient()
  const shouldReduceMotion = useReducedMotion()
  const [zoomOpen, setZoomOpen] = useState(false)
  const form = useForm({
    resolver: makeZodResolver(loginFormSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })
  const hasCustomBackdropMedia = Boolean(
    publicConfig.content.loginBackgroundImageUrl || publicConfig.content.loginBackgroundVideoUrl,
  )
  const heroAlt = `${publicConfig.platformName} sign-in spotlight`
  const shellClassName = preview
    ? 'min-h-[64rem] rounded-[2rem]'
    : 'h-screen'
  const frameClassName = preview
    ? 'mx-auto max-w-[92rem] px-4 py-4 sm:px-5 sm:py-5'
    : 'mx-auto h-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8'

  const loginMutation = useMutation({
    mutationFn: api.login,
    onSuccess: async () => {
      form.reset()
      await queryClient.invalidateQueries({ queryKey: ['session'] })
      toast.success('Signed in')
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Unable to sign in'
      toast.error(message)
    },
  })

  const backdropOverlay = useMemo(() => ({
    backgroundImage: [
      'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.50) 38%, color-mix(in_srgb,var(--surface)_72%,white) 100%)',
      'radial-gradient(circle at top left, color-mix(in_srgb,var(--primary)_24%, white), transparent 38%)',
      'radial-gradient(circle at bottom right, color-mix(in_srgb,var(--accent)_18%, white), transparent 32%)',
    ].join(','),
  }), [])

  return (
    <>
      <main className={`relative isolate overflow-hidden bg-[var(--surface)] text-foreground ${shellClassName}`}>
        {!hasCustomBackdropMedia ? <ThemeAtmosphere themeKey={publicConfig.theme.key} /> : null}
        {publicConfig.content.loginBackgroundImageUrl ? (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center opacity-70"
            style={{ backgroundImage: `url(${publicConfig.content.loginBackgroundImageUrl})` }}
          />
        ) : null}
        {publicConfig.content.loginBackgroundVideoUrl ? (
          <video
            aria-hidden="true"
            autoPlay
            className="absolute inset-0 h-full w-full object-cover opacity-72"
            loop
            muted
            playsInline
            poster={publicConfig.content.loginBackgroundImageUrl ?? undefined}
            src={publicConfig.content.loginBackgroundVideoUrl}
          />
        ) : null}
        <div aria-hidden="true" className="absolute inset-0" style={backdropOverlay} />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--foreground)_7%,transparent)_1px,transparent_1px),linear-gradient(0deg,color-mix(in_srgb,var(--foreground)_7%,transparent)_1px,transparent_1px)] bg-[length:28px_28px] opacity-35" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(255,255,255,0.12)_49%,transparent_51%,transparent_100%)] bg-[length:100%_6px] opacity-30" />

        <div className={`relative ${frameClassName}`}>
          <div className={`grid h-full gap-6 ${preview ? 'items-stretch xl:grid-cols-[1.22fr_0.78fr]' : 'items-center xl:grid-cols-[1.22fr_0.78fr]'}`}>
            <LoginHeroPanel
              imageUrl={publicConfig.content.loginImageUrl}
              message={publicConfig.content.loginMessage}
              onOpenZoom={() => setZoomOpen(true)}
              platformName={publicConfig.platformName}
              preview={preview}
              shouldReduceMotion={Boolean(shouldReduceMotion)}
              title={publicConfig.content.loginTitle}
            />

            <motion.div
              animate={{ opacity: 1, y: 0 }}
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 22 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.38, delay: shouldReduceMotion ? 0 : 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <Card className="rounded-[2rem] border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.78))] shadow-[0_20px_80px_rgba(15,23,42,0.10)] backdrop-blur">
                <CardHeader className="space-y-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <LockKeyhole className="size-5" />
                  </div>
                  <CardTitle className="text-2xl">{preview ? 'Sign-in preview' : 'Sign in'}</CardTitle>
                  <CardDescription>
                    {preview
                      ? 'Live preview mode. This uses the real sign-in layout without attempting authentication.'
                      : publicConfig.setup.isLaunched
                        ? 'Use your username and password to enter the platform.'
                        : 'Legacy admin access only. Player accounts stay locked until the onboarding launch step is complete.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {!publicConfig.setup.isLaunched && !preview ? (
                    <div className="rounded-2xl border border-border/70 bg-[var(--surface-alt)] px-4 py-3 text-sm text-muted-foreground">
                      Player accounts remain locked until the realm is launched.
                    </div>
                  ) : null}
                  <form
                    className="space-y-5"
                    onSubmit={form.handleSubmit((values) => {
                      if (preview) {
                        return
                      }

                      loginMutation.mutate(values)
                    })}
                  >
                    <FieldBlock
                      error={getFormErrorMessage(form.formState.errors.username)}
                      htmlFor={preview ? 'preview-username' : 'username'}
                      label="Username"
                    >
                      <Input
                        id={preview ? 'preview-username' : 'username'}
                        autoComplete="username"
                        disabled={preview}
                        placeholder="admin"
                        aria-invalid={Boolean(form.formState.errors.username)}
                        {...form.register('username')}
                      />
                    </FieldBlock>
                    <FieldBlock
                      error={getFormErrorMessage(form.formState.errors.password)}
                      htmlFor={preview ? 'preview-password' : 'password'}
                      label="Password"
                    >
                      <Input
                        id={preview ? 'preview-password' : 'password'}
                        type="password"
                        autoComplete="current-password"
                        disabled={preview}
                        placeholder="••••••••"
                        aria-invalid={Boolean(form.formState.errors.password)}
                        {...form.register('password')}
                      />
                    </FieldBlock>
                    <Button className="h-11 w-full rounded-xl" disabled={preview || loginMutation.isPending} type="submit">
                      {preview ? 'Preview only' : loginMutation.isPending ? 'Signing in...' : 'Enter Game'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <BaseModalContent className="border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(255,255,255,0.88))]" size="xl">
          <BaseModalHeader title={publicConfig.content.loginTitle} />
          <BaseModalBody spacing="none">
            {publicConfig.content.loginImageUrl ? (
            <img
              alt={heroAlt}
              className="max-h-[78dvh] w-full object-contain bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--hero-via)_55%,white),transparent_60%),var(--surface)]"
              src={publicConfig.content.loginImageUrl}
            />
            ) : null}
          </BaseModalBody>
        </BaseModalContent>
      </Dialog>
    </>
  )
}
