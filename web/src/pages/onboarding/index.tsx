import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, LogOut } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'

import { api, ApiError } from '@/api/client'
import { AttributeEditDialog } from '@/components/attributes/attribute-edit-dialog'
import { Button } from '@/components/ui/button'
import {
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
} from '@/components/ui/base-modal'
import { Dialog } from '@/components/ui/dialog'
import {
  createCategoryFormSchema,
  buildRuleFormEntries,
  createPlayerFormSchema,
  createRewardFormSchema,
  createTaskFormSchema,
  toCreateRewardPayload,
  toCreateTaskPayload,
  toUpdateCategoryAppearancePayload,
  updateCategoryAppearanceFormSchema,
  updateSettingsFormSchema,
} from '@/schemas/forms'
import { adminSectionPath, isOnboardingStep, onboardingStepPath, onboardingSteps, toOnboardingRouteStep, type OnboardingRouteStep } from '@/routes/app'
import { makeZodResolver } from '@/lib/zod-resolver'
import type { AdminBootstrap, AdminReward, AdminTask } from '@/types/app'
import { resolveThemeFontPresetKey } from '@shared/font-presets'

import { AdminAccessLanding } from './components/admin-access-landing'
import { OnboardingLoadingState } from './components/onboarding-loading-state'
import { OnboardingQuestEditor } from './components/onboarding-quest-editor'
import { OnboardingRewardEditor } from './components/onboarding-reward-editor'
import { ProgressRail } from './components/progress-rail'
import { AttributeStep } from './steps/attribute-step'
import { IdentityStep } from './steps/identity-step'
import { LaunchStep } from './steps/launch-step'
import { PlayerStep } from './steps/player-step'
import { QuestStep } from './steps/quest-step'
import { RewardStep } from './steps/reward-step'
import { getQuestDefaults, getQuestDefaultsFromTask, getRewardDefaults, getRewardDefaultsFromReward, getSettingsDefaults } from './lib/defaults'
import { handleMutationError } from './lib/rules'
import type { QuestFormValues, RewardFormValues } from './lib/types'
import { onboardingStepMeta } from './meta'

function getNextStep(step: OnboardingRouteStep) {
  const index = onboardingSteps.indexOf(step)
  return onboardingSteps[Math.min(index + 1, onboardingSteps.length - 1)] as OnboardingRouteStep
}

function getPreviousStep(step: OnboardingRouteStep) {
  const index = onboardingSteps.indexOf(step)
  return onboardingSteps[Math.max(index - 1, 0)] as OnboardingRouteStep
}

const launchLabelByStep = onboardingStepMeta.reduce<Record<OnboardingRouteStep, string>>((accumulator, item) => {
  accumulator[item.step] = item.label
  return accumulator
}, {} as Record<OnboardingRouteStep, string>)

function getMissingLaunchSteps(bootstrap: AdminBootstrap) {
  const missingSteps = new Set<OnboardingRouteStep>()

  if (!bootstrap.setup.requirements.identityConfigured || !bootstrap.setup.requirements.landingConfigured) {
    missingSteps.add('identity')
  }

  if (!bootstrap.setup.requirements.hasPlayer) {
    missingSteps.add('player')
  }

  if (!bootstrap.setup.requirements.hasAttribute) {
    missingSteps.add('attribute')
  }

  return Array.from(missingSteps)
}

function getLaunchStepLabels(steps: OnboardingRouteStep[]) {
  return steps.map((step) => `Complete ${launchLabelByStep[step] ?? step}.`)
}

export { AdminAccessLanding }

export function OnboardingShell() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const shouldReduceMotion = useReducedMotion()
  const { step: stepParam } = useParams()
  const currentStep = isOnboardingStep(stepParam) ? stepParam : null

  const bootstrapQuery = useQuery({
    queryKey: ['admin-onboarding-bootstrap'],
    queryFn: api.getAdminOnboardingBootstrap,
  })

  const bootstrap = bootstrapQuery.data
  const [editingCategory, setEditingCategory] = useState<AdminBootstrap['categories'][number] | null>(null)
  const [editingTask, setEditingTask] = useState<AdminTask | null>(null)
  const [editingReward, setEditingReward] = useState<AdminReward | null>(null)
  const [launchAttempted, setLaunchAttempted] = useState(false)
  const categories = useMemo(() => bootstrap?.categories.filter((category) => category.isActive) ?? [], [bootstrap])
  const players = useMemo(
    () => bootstrap?.players.filter((player) => player.role === 'player' && player.status === 'active') ?? [],
    [bootstrap],
  )
  const categoryIds = useMemo(() => categories.map((category) => category.id), [categories])

  const settingsForm = useForm({
    resolver: makeZodResolver(updateSettingsFormSchema),
    defaultValues: bootstrap ? getSettingsDefaults(bootstrap) : undefined,
  })
  const playerForm = useForm({
    resolver: makeZodResolver(createPlayerFormSchema),
    defaultValues: { displayName: '', username: '', temporaryPassword: '' },
  })
  const attributeForm = useForm({
    resolver: makeZodResolver(createCategoryFormSchema),
    defaultValues: { name: '', description: '', color: '#1f2937', icon: '' },
  })
  const editCategoryForm = useForm({
    resolver: makeZodResolver(updateCategoryAppearanceFormSchema),
    defaultValues: { name: '', color: '#1f2937', icon: '' },
  })
  const questForm = useForm({
    resolver: makeZodResolver(createTaskFormSchema),
    defaultValues: getQuestDefaults(categoryIds),
  })
  const rewardForm = useForm({
    resolver: makeZodResolver(createRewardFormSchema),
    defaultValues: getRewardDefaults(categoryIds),
  })
  const editQuestForm = useForm({
    resolver: makeZodResolver(createTaskFormSchema),
    defaultValues: getQuestDefaults(categoryIds),
  })
  const editRewardForm = useForm({
    resolver: makeZodResolver(createRewardFormSchema),
    defaultValues: getRewardDefaults(categoryIds),
  })

  const previewSettingsValues = settingsForm.watch()
  const settingsContentErrors = settingsForm.formState.errors.content as Record<string, unknown> | undefined
  const selectedThemeKey = settingsForm.watch('themePresetKey')

  useEffect(() => {
    if (bootstrap) {
      settingsForm.reset(getSettingsDefaults(bootstrap))
    }
  }, [bootstrap, settingsForm])

  useEffect(() => {
    const nextFontPresetKey = resolveThemeFontPresetKey(selectedThemeKey)
    if (settingsForm.getValues('content.fontPresetKey') !== nextFontPresetKey) {
      settingsForm.setValue('content.fontPresetKey', nextFontPresetKey, { shouldDirty: true })
    }
  }, [selectedThemeKey, settingsForm])

  useEffect(() => {
    if (!editingCategory) {
      editCategoryForm.reset({ name: '', color: '#1f2937', icon: '' })
      return
    }

    editCategoryForm.reset({
      name: editingCategory.name,
      color: editingCategory.color,
      icon: editingCategory.icon ?? '',
    })
  }, [editCategoryForm, editingCategory])

  useEffect(() => {
    questForm.setValue('rewardRules', buildRuleFormEntries(categoryIds, questForm.getValues('rewardRules')), { shouldDirty: false })
    questForm.setValue('penaltyRules', buildRuleFormEntries(categoryIds, questForm.getValues('penaltyRules')), { shouldDirty: false })
    rewardForm.setValue('costs', buildRuleFormEntries(categoryIds, rewardForm.getValues('costs')), { shouldDirty: false })
  }, [categoryIds, questForm, rewardForm])

  useEffect(() => {
    editQuestForm.reset(getQuestDefaultsFromTask(categoryIds, editingTask ?? undefined))
  }, [editQuestForm, editingTask])

  useEffect(() => {
    editRewardForm.reset(getRewardDefaultsFromReward(categoryIds, editingReward ?? undefined))
  }, [editRewardForm, editingReward])

  useEffect(() => {
    if (!bootstrap) {
      return
    }

    const fallbackStep = toOnboardingRouteStep(bootstrap.setup.currentStep)
    if (!currentStep) {
      navigate(onboardingStepPath(fallbackStep), { replace: true })
      return
    }

    // Keep the server-side checkpoint in sync so refreshes and re-logins land on the same stage.
    void api.updateOnboardingState({
      currentStep,
      lastVisitedStep: currentStep,
    }).catch(() => undefined)
  }, [bootstrap, currentStep, navigate])

  useEffect(() => {
    if (!currentStep || typeof window === 'undefined') {
      return
    }

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })
  }, [currentStep])

  useEffect(() => {
    if (!bootstrap) {
      return
    }

    if (getMissingLaunchSteps(bootstrap).length === 0) {
      setLaunchAttempted(false)
    }
  }, [bootstrap])

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['session'] }),
      queryClient.invalidateQueries({ queryKey: ['public-config'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-bootstrap'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-onboarding-bootstrap'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-rewards'] }),
    ])
  }

  const saveStepProgress = async (step: OnboardingRouteStep) => {
    await api.updateOnboardingState({
      currentStep: step,
      lastVisitedStep: step,
      completedSteps: [step],
    })
    await refreshAll()
  }

  const settingsMutation = useMutation({
    mutationFn: api.updateSettings,
    onError: handleMutationError,
  })
  const playerMutation = useMutation({
    mutationFn: api.createPlayer,
    onError: handleMutationError,
  })
  const deletePlayerMutation = useMutation({
    mutationFn: api.deletePlayer,
    onError: handleMutationError,
  })
  const attributeMutation = useMutation({
    mutationFn: api.createCategory,
    onError: handleMutationError,
  })
  const updateCategoryMutation = useMutation({
    mutationFn: ({ categoryId, payload }: { categoryId: number; payload: ReturnType<typeof toUpdateCategoryAppearancePayload> }) =>
      api.updateCategory(categoryId, payload),
    onError: handleMutationError,
  })
  const deleteCategoryMutation = useMutation({
    mutationFn: api.deleteCategory,
    onError: handleMutationError,
  })
  const questMutation = useMutation({
    mutationFn: api.createTask,
    onError: handleMutationError,
  })
  const rewardMutation = useMutation({
    mutationFn: api.createReward,
    onError: handleMutationError,
  })
  const launchMutation = useMutation({
    mutationFn: api.launchOnboarding,
  })
  const logoutMutation = useMutation({
    mutationFn: api.logout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] })
      navigate('/', { replace: true })
    },
    onError: handleMutationError,
  })
  const adminTasksQuery = useQuery({
    queryKey: ['admin-tasks', 'onboarding'],
    queryFn: () => api.getAdminTasks({ page: 1, pageSize: 20 }),
    enabled: currentStep === 'quest' || currentStep === 'launch',
  })
  const adminRewardsQuery = useQuery({
    queryKey: ['admin-rewards', 'onboarding'],
    queryFn: () => api.getAdminRewards({ page: 1, pageSize: 20 }),
    enabled: currentStep === 'reward' || currentStep === 'launch',
  })
  const updateQuestMutation = useMutation({
    mutationFn: ({ taskId, payload }: { taskId: number; payload: Parameters<typeof api.updateTask>[1] }) => api.updateTask(taskId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-tasks'] })
      await refreshAll()
      setEditingTask(null)
      toast.success('Quest updated')
    },
    onError: handleMutationError,
  })
  const deleteQuestMutation = useMutation({
    mutationFn: api.deleteTask,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-tasks'] })
      await refreshAll()
      toast.success('Quest removed')
    },
    onError: handleMutationError,
  })
  const updateRewardMutation = useMutation({
    mutationFn: ({ rewardId, payload }: { rewardId: number; payload: Parameters<typeof api.updateReward>[1] }) => api.updateReward(rewardId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-rewards'] })
      await refreshAll()
      setEditingReward(null)
      toast.success('Reward updated')
    },
    onError: handleMutationError,
  })
  const deleteRewardMutation = useMutation({
    mutationFn: api.deleteReward,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-rewards'] })
      await refreshAll()
      toast.success('Reward removed')
    },
    onError: handleMutationError,
  })

  if (!bootstrap || !currentStep) {
    return <OnboardingLoadingState />
  }

  const defaultSettingsValues = getSettingsDefaults(bootstrap)
  const resolvedPreviewSettingsValues = {
    ...defaultSettingsValues,
    ...previewSettingsValues,
    content: {
      ...defaultSettingsValues.content,
      ...(previewSettingsValues.content ?? {}),
    },
  }

  const currentIndex = onboardingSteps.indexOf(currentStep)
  const canGoBack = currentIndex > 0
  const canGoNext = currentIndex < onboardingSteps.length - 1
  const activeMeta = onboardingStepMeta[currentIndex]
  const adminTasks = adminTasksQuery.data?.items ?? []
  const adminRewards = adminRewardsQuery.data?.items ?? []

  let activeStep = null
  switch (currentStep) {
    case 'identity':
      activeStep = (
        <IdentityStep
          bootstrap={bootstrap}
          form={settingsForm}
          previewValues={resolvedPreviewSettingsValues}
          settingsContentErrors={settingsContentErrors}
          isSaving={settingsMutation.isPending}
          onSave={async (values) => {
            await settingsMutation.mutateAsync(values as Parameters<typeof api.updateSettings>[0])
            toast.success('Identity and sign-in surface saved')
            await saveStepProgress('identity')
          }}
        />
      )
      break
    case 'player':
      activeStep = (
        <PlayerStep
          deletePlayerPending={deletePlayerMutation.isPending}
          form={playerForm}
          isCreating={playerMutation.isPending}
          players={players}
          onDeletePlayer={async (playerId) => {
            await deletePlayerMutation.mutateAsync(playerId)
            await refreshAll()
            toast.success('Player removed')
          }}
          onSave={async (values) => {
            await playerMutation.mutateAsync(values as Parameters<typeof api.createPlayer>[0])
            playerForm.reset({ displayName: '', username: '', temporaryPassword: '' })
            toast.success('Player created')
            await saveStepProgress('player')
          }}
        />
      )
      break
    case 'attribute':
      activeStep = (
        <AttributeStep
          form={attributeForm}
          categories={categories}
          isCreating={attributeMutation.isPending}
          isEditing={updateCategoryMutation.isPending}
          isDeleting={deleteCategoryMutation.isPending}
          onEdit={(categoryId) => {
            const category = categories.find((item) => item.id === categoryId) ?? null
            setEditingCategory(category)
          }}
          onDelete={(categoryId) => {
            const category = categories.find((item) => item.id === categoryId)
            if (!category) {
              return
            }

            if (!window.confirm(`Delete ${category.name}? This only works when it is no longer used by quests or rewards and all balances are zero.`)) {
              return
            }

            void (async () => {
              try {
                await deleteCategoryMutation.mutateAsync(categoryId)
                toast.success('Kudos track deleted')
                await saveStepProgress('attribute')
              } catch {
                return
              }
            })()
          }}
          onSave={async (values) => {
            await attributeMutation.mutateAsync(values as Parameters<typeof api.createCategory>[0])
            attributeForm.reset({ name: '', description: '', color: '#1f2937', icon: '' })
            toast.success('Kudos track created')
            await saveStepProgress('attribute')
          }}
        />
      )
      break
    case 'quest':
      activeStep = (
        <QuestStep
          adminTasks={adminTasks}
          categories={categories}
          form={questForm}
          isCreating={questMutation.isPending}
          onDelete={(taskId) => deleteQuestMutation.mutate(taskId)}
          onEdit={(taskId) => {
            const task = adminTasks.find((item) => item.id === taskId)
            if (task) {
              setEditingTask(task)
            }
          }}
          onSave={async (values) => {
            await questMutation.mutateAsync(toCreateTaskPayload(values as QuestFormValues))
            questForm.reset(getQuestDefaults(categoryIds))
            toast.success('Quest created')
            await saveStepProgress('quest')
          }}
          onToggleVisibility={(taskId, nextActive) => {
            const task = adminTasks.find((item) => item.id === taskId)
            if (!task) {
              return
            }

            updateQuestMutation.mutate({
              taskId,
              payload: {
                ...toCreateTaskPayload(getQuestDefaultsFromTask(categoryIds, task)),
                isActive: nextActive,
              },
            })
          }}
        />
      )
      break
    case 'reward':
      activeStep = (
        <RewardStep
          adminRewards={adminRewards}
          categories={categories}
          form={rewardForm}
          isCreating={rewardMutation.isPending}
          onDelete={(rewardId) => deleteRewardMutation.mutate(rewardId)}
          onEdit={(rewardId) => {
            const reward = adminRewards.find((item) => item.id === rewardId)
            if (reward) {
              setEditingReward(reward)
            }
          }}
          onSave={async (values) => {
            await rewardMutation.mutateAsync(toCreateRewardPayload(values as RewardFormValues))
            rewardForm.reset(getRewardDefaults(categoryIds))
            toast.success('Reward created')
            await saveStepProgress('reward')
          }}
          onToggleVisibility={(rewardId, nextActive) => {
            const reward = adminRewards.find((item) => item.id === rewardId)
            if (!reward) {
              return
            }

            updateRewardMutation.mutate({
              rewardId,
              payload: {
                ...toCreateRewardPayload(getRewardDefaultsFromReward(categoryIds, reward)),
                isActive: nextActive,
              },
            })
          }}
        />
      )
      break
    case 'launch':
      activeStep = (
        <LaunchStep
          bootstrap={bootstrap}
          categoriesCount={categories.length}
          launchError={launchAttempted ? getLaunchStepLabels(getMissingLaunchSteps(bootstrap)) : []}
          playersCount={players.length}
          isLaunching={launchMutation.isPending}
          onLaunch={async () => {
            const missingLaunchSteps = getMissingLaunchSteps(bootstrap)
            if (missingLaunchSteps.length > 0) {
              setLaunchAttempted(true)
              return
            }

            try {
              setLaunchAttempted(false)
              await launchMutation.mutateAsync()
              await refreshAll()
              toast.success('Realm launched')
              navigate('/app/overview', { replace: true })
            } catch (error) {
              await refreshAll()

              if (error instanceof ApiError && error.status === 400) {
                setLaunchAttempted(true)
                return
              }

              handleMutationError(error)
            }
          }}
        />
      )
      break
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--primary)_16%,white),transparent_34%),radial-gradient(circle_at_bottom_right,color-mix(in_srgb,var(--accent)_14%,white),transparent_38%),linear-gradient(180deg,var(--surface),color-mix(in_srgb,var(--surface-alt)_86%,white))] text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--foreground)_5%,transparent)_1px,transparent_1px),linear-gradient(0deg,color-mix(in_srgb,var(--foreground)_5%,transparent)_1px,transparent_1px)] bg-[length:28px_28px]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(255,255,255,0.1)_49%,transparent_51%,transparent_100%)] bg-[length:100%_6px] opacity-20" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="theme-shell-panel flex flex-wrap items-center justify-between gap-3 rounded-[1.75rem] px-4 py-4">
          <div>
            <p className="retro-ui text-xs uppercase tracking-[0.3em] text-primary">{bootstrap.settings.platformName}</p>
            <h1 className="text-xl text-foreground">{activeMeta.label}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentStep !== 'launch' ? (
              <Button asChild variant="outline">
                <Link to={adminSectionPath('branding')}>Admin Studio</Link>
              </Button>
            ) : null}
            <Button disabled={logoutMutation.isPending} variant="outline" onClick={() => logoutMutation.mutate()}>
              <LogOut className="mr-2 size-4" />
              Log out
            </Button>
          </div>
        </header>

        <ProgressRail
          completedSteps={bootstrap.setup.completedSteps}
          currentIndex={currentIndex}
          currentStep={currentStep}
          onSelectStep={(step) => navigate(onboardingStepPath(step))}
        />

        <div className="flex-1 py-6">
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={currentStep}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -8, filter: 'blur(8px)' }}
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 14, filter: 'blur(8px)' }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {activeStep}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="theme-shell-panel flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] px-4 py-4">
          <div className="theme-shell-muted text-sm">
            {activeMeta.optional ? 'Save keeps you on this step. Use Skip to leave it empty for now, or Next if you just want to keep moving.' : 'Save keeps you on this step. Use Next only when you are ready to move on.'}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button disabled={!canGoBack} type="button" variant="outline" onClick={() => navigate(onboardingStepPath(getPreviousStep(currentStep)))}>
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Button>
            {activeMeta.optional ? (
              <Button disabled={!canGoNext} type="button" variant="outline" onClick={() => navigate(onboardingStepPath(getNextStep(currentStep)))}>
                Skip
              </Button>
            ) : null}
            {canGoNext ? (
              <Button type="button" onClick={() => navigate(onboardingStepPath(getNextStep(currentStep)))}>
                Next
              </Button>
            ) : null}
          </div>
        </footer>

        <Dialog open={Boolean(editingTask)} onOpenChange={(open) => {
          if (!open) {
            setEditingTask(null)
          }
        }}
        >
          <BaseModalContent className="flex overflow-hidden" size="editor">
            <BaseModalHeader
              title="Edit quest"
              description="Adjust the quest details and values without leaving onboarding."
            />
            {editingTask ? (
              <form
                className="flex min-h-0 flex-1 flex-col overflow-hidden"
                onSubmit={editQuestForm.handleSubmit((values) => {
                  updateQuestMutation.mutate({
                    taskId: editingTask.id,
                    payload: toCreateTaskPayload(values as QuestFormValues),
                  })
                })}
              >
                <BaseModalBody scrollable>
                  <OnboardingQuestEditor form={editQuestForm} categories={categories} />
                </BaseModalBody>
                <BaseModalFooter className="flex-wrap">
                  <Button type="button" variant="outline" onClick={() => setEditingTask(null)}>Cancel</Button>
                  <Button disabled={updateQuestMutation.isPending} type="submit">Save quest</Button>
                </BaseModalFooter>
              </form>
            ) : null}
          </BaseModalContent>
        </Dialog>

        <Dialog open={Boolean(editingReward)} onOpenChange={(open) => {
          if (!open) {
            setEditingReward(null)
          }
        }}
        >
          <BaseModalContent className="flex overflow-hidden" size="editor">
            <BaseModalHeader
              title="Edit reward"
              description="Adjust the reward details and costs without leaving onboarding."
            />
            {editingReward ? (
              <form
                className="flex min-h-0 flex-1 flex-col overflow-hidden"
                onSubmit={editRewardForm.handleSubmit((values) => {
                  updateRewardMutation.mutate({
                    rewardId: editingReward.id,
                    payload: toCreateRewardPayload(values as RewardFormValues),
                  })
                })}
              >
                <BaseModalBody scrollable>
                  <OnboardingRewardEditor form={editRewardForm} categories={categories} />
                </BaseModalBody>
                <BaseModalFooter className="flex-wrap">
                  <Button type="button" variant="outline" onClick={() => setEditingReward(null)}>Cancel</Button>
                  <Button disabled={updateRewardMutation.isPending} type="submit">Save reward</Button>
                </BaseModalFooter>
              </form>
            ) : null}
          </BaseModalContent>
        </Dialog>

        <AttributeEditDialog
          open={Boolean(editingCategory)}
          category={editingCategory}
          form={editCategoryForm}
          isPending={updateCategoryMutation.isPending}
          onOpenChange={(open) => {
            if (!open) {
              setEditingCategory(null)
            }
          }}
          onSubmit={async (values) => {
            if (!editingCategory) {
              return
            }

            await updateCategoryMutation.mutateAsync({
              categoryId: editingCategory.id,
              payload: toUpdateCategoryAppearancePayload(values),
            })
            setEditingCategory(null)
            toast.success('Kudos track updated')
            await saveStepProgress('attribute')
          }}
        />
      </div>
    </main>
  )
}
