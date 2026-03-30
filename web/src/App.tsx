import { lazy, Suspense, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Controller, useForm, type UseFormReturn } from 'react-hook-form'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'

import { AvatarCropField } from '@/components/avatar-crop-field'
import { FieldBlock } from '@/components/forms/field-block'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getFormErrorMessage } from '@/lib/form-errors'
import { makeZodResolver } from '@/lib/zod-resolver'
import { LoginScreen } from '@/pages/login'
import { AdminAccessLanding } from '@/pages/onboarding/components/admin-access-landing'
import { api, ApiError } from '@/api/client'
import { changePasswordFormSchema, toChangePasswordPayload } from '@/schemas/forms'
import { getDefaultAppPath, onboardingStepPath, toOnboardingRouteStep } from '@/routes/app'
import { applyTheme } from '@/lib/theme'
import { useRealtime } from '@/hooks/use-realtime'

const DashboardPage = lazy(async () => {
  const module = await import('@/pages/dashboard')
  return { default: module.Dashboard }
})

const OnboardingShellPage = lazy(async () => {
  const module = await import('@/pages/onboarding')
  return { default: module.OnboardingShell }
})

type ChangePasswordFormValues = {
  avatarDataUrl: string | null
  confirmNewPassword: string
  email: string
  newPassword: string
}

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const shouldReduceMotion = useReducedMotion()
  const [isVerifyingEmailToken, setIsVerifyingEmailToken] = useState(false)
  const [hydratedPasswordSetupUserId, setHydratedPasswordSetupUserId] = useState<number | null>(null)
  const changePasswordForm = useForm({
    resolver: makeZodResolver(changePasswordFormSchema),
    defaultValues: {
      newPassword: '',
      confirmNewPassword: '',
      email: '',
      avatarDataUrl: null as string | null,
    },
  })

  const publicConfigQuery = useQuery({
    queryKey: ['public-config'],
    queryFn: api.getPublicConfig,
  })

  const sessionQuery = useQuery({
    queryKey: ['session'],
    queryFn: api.getSession,
  })

  const changePasswordMutation = useMutation({
    mutationFn: api.completePasswordSetup,
    onSuccess: async () => {
      changePasswordForm.reset({
        newPassword: '',
        confirmNewPassword: '',
        email: '',
        avatarDataUrl: null,
      })
      // The API issues a fresh auth cookie after rotating the temporary-password session.
      await queryClient.refetchQueries({ queryKey: ['session'], exact: true })
      toast.success('Password updated.')
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Unable to update password'
      toast.error(message)
    },
  })

  const logoutMutation = useMutation({
    mutationFn: api.logout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] })
      navigate('/login', { replace: true })
    },
  })

  const themeTokens = sessionQuery.data?.platform.theme.tokens || publicConfigQuery.data?.theme.tokens

  useEffect(() => {
    applyTheme(themeTokens)
  }, [themeTokens])

  useEffect(() => {
    const session = sessionQuery.data

    if (!session?.user.mustChangePassword) {
      setHydratedPasswordSetupUserId(null)
      return
    }

    if (hydratedPasswordSetupUserId === session.user.id) {
      return
    }

    changePasswordForm.reset({
      newPassword: '',
      confirmNewPassword: '',
      email: session.user.email || '',
      avatarDataUrl: null,
    })
    setHydratedPasswordSetupUserId(session.user.id)
  }, [changePasswordForm, hydratedPasswordSetupUserId, sessionQuery.data])

  useRealtime({
    enabled: Boolean(sessionQuery.data),
    liveToastsEnabled: Boolean(sessionQuery.data?.profile.inAppNotificationsEnabled),
  })

  useEffect(() => {
    const token = searchParams.get('verifyEmailToken')

    if (!token || isVerifyingEmailToken) {
      return
    }

    setIsVerifyingEmailToken(true)
    api.verifyEmailToken(token)
      .then(async () => {
        const nextParams = new URLSearchParams(searchParams)
        nextParams.delete('verifyEmailToken')
        setSearchParams(nextParams, { replace: true })
        await queryClient.invalidateQueries({ queryKey: ['session'] })
        toast.success('Email verified')
      })
      .catch((error) => {
        const message = error instanceof ApiError ? error.message : 'Email verification failed'
        toast.error(message)
      })
      .finally(() => {
        setIsVerifyingEmailToken(false)
      })
  }, [isVerifyingEmailToken, queryClient, searchParams, setSearchParams])

  if (!publicConfigQuery.data) {
    return <LoadingState label="Loading platform" />
  }

  if (sessionQuery.isLoading) {
    return <LoadingState label="Checking session" />
  }

  const session = sessionQuery.data
  const defaultAppPath = session
    ? getDefaultAppPath({
        role: session.user.role,
        needsSetup: session.platform.onboarding.needsSetup,
        onboardingStep: session.platform.setup.currentStep,
      })
    : '/'
  const rootPathWithSearch = location.search ? `/${location.search}` : '/'
  const transitionScope = location.pathname.startsWith('/app/')
    ? 'app-shell'
    : location.pathname.startsWith('/setup/')
      ? location.pathname.startsWith('/setup/onboarding/') ? 'onboarding-shell' : 'password-setup'
      : 'public-shell'

  return (
    <>
      <Toaster position="top-center" />
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={transitionScope}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          className="min-h-screen"
          exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -10, filter: 'blur(6px)' }}
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12, filter: 'blur(8px)' }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.34,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <Routes>
            {!session ? (
              <>
                <Route path="/" element={publicConfigQuery.data.setup.isLaunched ? <LoginScreen publicConfig={publicConfigQuery.data} /> : <AdminAccessLanding publicConfig={publicConfigQuery.data} />} />
                <Route path="/login" element={<LoginScreen publicConfig={publicConfigQuery.data} />} />
                <Route path="*" element={<Navigate replace to={rootPathWithSearch} />} />
              </>
            ) : session.user.mustChangePassword ? (
              <>
                <Route
                  path="/setup/password"
                  element={(
                    <PasswordSetupScreen
                      changePasswordForm={changePasswordForm}
                      existingAvatarUrl={session.user.avatarUrl}
                      isSubmitting={changePasswordMutation.isPending}
                      isLoggingOut={logoutMutation.isPending}
                      onLogout={() => logoutMutation.mutate()}
                      onSubmit={(values) => changePasswordMutation.mutate(toChangePasswordPayload(values))}
                    />
                  )}
                />
                <Route path="*" element={<Navigate replace to="/setup/password" />} />
              </>
            ) : (
              <>
                {session.user.role === 'admin' && !session.platform.setup.isLaunched ? (
                  <Route
                    path="/setup/onboarding/:step"
                    element={(
                      <Suspense fallback={<LoadingState label="Loading onboarding" />}>
                        <OnboardingShellPage />
                      </Suspense>
                    )}
                  />
                ) : null}
                <Route
                  path="/app/*"
                  element={(
                    <Suspense fallback={<LoadingState label="Loading dashboard" />}>
                      <DashboardPage session={session} />
                    </Suspense>
                  )}
                />
                <Route path="/" element={<Navigate replace to={defaultAppPath} />} />
                <Route path="/login" element={<Navigate replace to={defaultAppPath} />} />
                <Route path="/setup/password" element={<Navigate replace to={defaultAppPath} />} />
                <Route
                  path="/setup/onboarding"
                  element={<Navigate replace to={onboardingStepPath(toOnboardingRouteStep(session.platform.setup.currentStep))} />}
                />
                <Route path="*" element={<Navigate replace to={defaultAppPath} />} />
              </>
            )}
          </Routes>
        </motion.div>
      </AnimatePresence>
    </>
  )
}

function PasswordSetupScreen({
  changePasswordForm,
  existingAvatarUrl,
  isSubmitting,
  isLoggingOut,
  onLogout,
  onSubmit,
}: {
  changePasswordForm: UseFormReturn<ChangePasswordFormValues>
  existingAvatarUrl: string | null
  isSubmitting: boolean
  isLoggingOut: boolean
  onLogout: () => void
  onSubmit: (values: ChangePasswordFormValues) => void
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface)] px-4 py-8">
      <motion.div
        animate={{ opacity: 1, y: 0, scale: 1 }}
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="w-full max-w-xl rounded-[2rem] shadow-[0_24px_90px_rgba(15,23,42,0.10)]">
          <CardHeader>
            <CardTitle>Change temporary password</CardTitle>
            <CardDescription>
              This account was created with a temporary password. Replace it before accessing the rest of the platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={changePasswordForm.handleSubmit(onSubmit)}
            >
              <FieldBlock
                error={getFormErrorMessage(changePasswordForm.formState.errors.newPassword)}
                htmlFor="newPassword"
                label="New password"
              >
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(changePasswordForm.formState.errors.newPassword)}
                  {...changePasswordForm.register('newPassword')}
                />
              </FieldBlock>
              <FieldBlock
                error={getFormErrorMessage(changePasswordForm.formState.errors.confirmNewPassword)}
                htmlFor="confirmNewPassword"
                label="Confirm new password"
              >
                <Input
                  id="confirmNewPassword"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(changePasswordForm.formState.errors.confirmNewPassword)}
                  {...changePasswordForm.register('confirmNewPassword')}
                />
              </FieldBlock>
              <FieldBlock
                description="You can skip this now. Email notifications only start after the address is verified."
                error={getFormErrorMessage(changePasswordForm.formState.errors.email)}
                htmlFor="optionalEmail"
                label="Email for notifications (optional)"
              >
                <Input
                  id="optionalEmail"
                  type="email"
                  placeholder="you@example.com"
                  aria-invalid={Boolean(changePasswordForm.formState.errors.email)}
                  {...changePasswordForm.register('email')}
                />
              </FieldBlock>
              <FieldBlock label="Avatar (optional)">
                <Controller
                  control={changePasswordForm.control}
                  name="avatarDataUrl"
                  render={({ field }) => (
                    <AvatarCropField
                      fallbackValue={existingAvatarUrl}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </FieldBlock>
              <div className="flex gap-3">
                <Button disabled={isSubmitting} type="submit">
                  Save password
                </Button>
                <Button disabled={isLoggingOut} type="button" variant="outline" onClick={onLogout}>
                  Log out
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  )
}

function LoadingState({ label }: { label: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface)] px-4 py-8">
      <div className="flex flex-col items-center gap-5 text-center">
        <LoaderCircle
          aria-hidden="true"
          className="size-16 animate-spin text-primary drop-shadow-[0_10px_30px_color-mix(in_oklab,var(--primary)_25%,transparent)]"
        />
        <div className="space-y-1">
          <p className="text-lg font-semibold text-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">Please wait while Questly finishes the latest platform check.</p>
        </div>
      </div>
    </main>
  )
}

export default App
