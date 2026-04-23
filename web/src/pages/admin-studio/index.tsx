import { type ReactNode, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

import {
  buildRuleFormEntries,
  createCategoryFormSchema,
  createPlayerFormSchema,
  createRewardFormSchema,
  createTaskFormSchema,
  toCreateCategoryPayload,
  toCreateRewardPayload,
  toCreateTaskPayload,
  toUpdateCategoryAppearancePayload,
  toUpdatePlayerBalancesPayload,
  updateCategoryAppearanceFormSchema,
  updateSettingsFormSchema,
} from '@/schemas/forms'
import { AttributeEditDialog } from '@/components/attributes/attribute-edit-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import {
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
} from '@/components/ui/base-modal'
import { makeZodResolver } from '@/lib/zod-resolver'
import { QuestEditorFields } from '@/components/admin-studio/quest-editor-fields'
import { RewardEditorFields } from '@/components/admin-studio/reward-editor-fields'
import { api, ApiError } from '@/api/client'
import { adminSections, type AdminSection } from '@/routes/app'
import type { AdminBootstrap, AdminReward, AdminTask } from '@/types/app'
import { resolveThemeFontPresetKey } from '@shared/font-presets'
import { adminSectionMeta } from './meta'
import { AdminStudioBrandingSection } from './sections/branding-section'
import { AdminStudioCategoriesSection } from './sections/categories-section'
import { AdminStudioPlayersSection } from './sections/players-section'
import { AdminStudioQuestsSection } from './sections/quests-section'
import { AdminStudioRewardsSection } from './sections/rewards-section'
import {
  getQuestDefaults,
  getRewardDefaults,
  getSectionIndex,
  getSettingsDefaults,
  mergePlayerBalances,
  toRewardPayloadFromReward,
  toTaskPayloadFromTask,
} from './utils'
import type { QuestFormValues, RewardFormValues } from './utils'

interface AdminStudioProps {
  activeSection: AdminSection
  bootstrap: AdminBootstrap
  focusedRewardId?: number | null
  focusedRewardSearch?: string
  onFocusedRewardHandled?: () => void
  onSectionChange: (section: AdminSection) => void
}

export function AdminStudio({
  activeSection,
  bootstrap,
  focusedRewardId = null,
  focusedRewardSearch = '',
  onFocusedRewardHandled,
  onSectionChange,
}: AdminStudioProps) {
  const queryClient = useQueryClient()
  const shouldReduceMotion = useReducedMotion()
  const categories = useMemo(
    () => bootstrap.categories.filter((category) => category.isActive),
    [bootstrap.categories],
  )
  const players = useMemo(
    () => bootstrap.players.filter((player) => player.role === 'player' && player.status === 'active'),
    [bootstrap.players],
  )
  const playerBalancesById = useMemo(() => new Map(
    players.map((player) => [player.id, mergePlayerBalances(player.balances, categories)]),
  ), [categories, players])
  const categoryIds = useMemo(() => categories.map((category) => category.id), [categories])
  const categoryIdsKey = useMemo(() => categoryIds.join(','), [categoryIds])
  const resolvedActiveSection = adminSections.includes(activeSection) ? activeSection : 'players'

  const playerForm = useForm({
    resolver: makeZodResolver(createPlayerFormSchema),
    defaultValues: {
      displayName: '',
      username: '',
      temporaryPassword: '',
    },
  })
  const categoryForm = useForm({
    resolver: makeZodResolver(createCategoryFormSchema),
    defaultValues: {
      name: '',
      description: '',
      color: '#1f2937',
      icon: '',
    },
  })
  const settingsForm = useForm({
    resolver: makeZodResolver(updateSettingsFormSchema),
    defaultValues: getSettingsDefaults(bootstrap),
  })
  const editCategoryForm = useForm({
    resolver: makeZodResolver(updateCategoryAppearanceFormSchema),
    defaultValues: {
      name: '',
      color: '#1f2937',
      icon: '',
    },
  })
  const questForm = useForm<QuestFormValues>({
    resolver: makeZodResolver(createTaskFormSchema) as never,
    defaultValues: getQuestDefaults(categoryIds),
  })
  const editQuestForm = useForm<QuestFormValues>({
    resolver: makeZodResolver(createTaskFormSchema) as never,
    defaultValues: getQuestDefaults(categoryIds),
  })
  const rewardForm = useForm<RewardFormValues>({
    resolver: makeZodResolver(createRewardFormSchema) as never,
    defaultValues: getRewardDefaults(categoryIds),
  })
  const editRewardForm = useForm<RewardFormValues>({
    resolver: makeZodResolver(createRewardFormSchema) as never,
    defaultValues: getRewardDefaults(categoryIds),
  })

  const [editingCategory, setEditingCategory] = useState<AdminBootstrap['categories'][number] | null>(null)
  const [editingTask, setEditingTask] = useState<AdminTask | null>(null)
  const [editingReward, setEditingReward] = useState<AdminReward | null>(null)
  const [questCatalogSearch, setQuestCatalogSearch] = useState('')
  const [rewardCatalogSearch, setRewardCatalogSearch] = useState('')
  const [questCatalogPage, setQuestCatalogPage] = useState(1)
  const [rewardCatalogPage, setRewardCatalogPage] = useState(1)

  const deferredQuestCatalogSearch = useDeferredValue(questCatalogSearch.trim())
  const deferredRewardCatalogSearch = useDeferredValue(rewardCatalogSearch.trim())
  const questAssignmentMode = questForm.watch('assignmentMode')
  const questSelectedUserIds = questForm.watch('userIds')
  const rewardAssignmentMode = rewardForm.watch('assignmentMode')
  const rewardSelectedUserIds = rewardForm.watch('userIds')
  const previewSettingsValues = settingsForm.watch()
  const selectedThemeKey = settingsForm.watch('themePresetKey')
  const defaultSettingsValues = getSettingsDefaults(bootstrap)
  const resolvedPreviewSettingsValues = {
    ...defaultSettingsValues,
    ...previewSettingsValues,
    content: {
      ...defaultSettingsValues.content,
      ...(previewSettingsValues.content ?? {}),
    },
  }
  const settingsContentErrors = settingsForm.formState.errors.content as Record<string, unknown> | undefined

  useEffect(() => {
    setQuestCatalogPage(1)
  }, [deferredQuestCatalogSearch])

  useEffect(() => {
    setRewardCatalogPage(1)
  }, [deferredRewardCatalogSearch])

  useEffect(() => {
    settingsForm.reset(getSettingsDefaults(bootstrap))
  }, [
    settingsForm,
    bootstrap.settings.platformName,
    bootstrap.settings.theme.key,
    bootstrap.settings.content.loginTitle,
    bootstrap.settings.content.loginMessage,
    bootstrap.settings.content.loginImageUrl,
    bootstrap.settings.content.loginBackgroundImageUrl,
    bootstrap.settings.content.loginBackgroundImageSource,
    bootstrap.settings.content.loginBackgroundVideoUrl,
    bootstrap.settings.content.loginBackgroundVideoSource,
    bootstrap.settings.content.fontPresetKey,
    bootstrap.settings.content.dashboardTitle,
    bootstrap.settings.content.dashboardMessage,
    bootstrap.settings.content.onboardingIntroEyebrow,
    bootstrap.settings.content.onboardingIntroTitle,
    bootstrap.settings.content.onboardingIntroMessage,
    bootstrap.settings.content.onboardingLaunchTitle,
    bootstrap.settings.content.onboardingLaunchMessage,
  ])

  useEffect(() => {
    const nextFontPresetKey = resolveThemeFontPresetKey(selectedThemeKey)
    if (settingsForm.getValues('content.fontPresetKey') !== nextFontPresetKey) {
      settingsForm.setValue('content.fontPresetKey', nextFontPresetKey, { shouldDirty: true })
    }
  }, [selectedThemeKey, settingsForm])

  useEffect(() => {
    if (!editingCategory) {
      editCategoryForm.reset({
        name: '',
        color: '#1f2937',
        icon: '',
      })
      return
    }

    editCategoryForm.reset({
      name: editingCategory.name,
      color: editingCategory.color,
      icon: editingCategory.icon ?? '',
    })
  }, [editCategoryForm, editingCategory])

  useEffect(() => {
    if (!editingTask) {
      editQuestForm.reset(getQuestDefaults(categoryIds))
      return
    }

    editQuestForm.reset(getQuestDefaults(categoryIds, editingTask))
  }, [editQuestForm, editingTask])

  useEffect(() => {
    if (!editingReward) {
      editRewardForm.reset(getRewardDefaults(categoryIds))
      return
    }

    editRewardForm.reset(getRewardDefaults(categoryIds, editingReward))
  }, [editRewardForm, editingReward])

  useEffect(() => {
    // Only resync rule arrays when the category ID set changes. Cosmetic
    // attribute edits should not wipe any in-progress quest or reward drafts.
    const currentQuestValues = questForm.getValues()
    questForm.reset({
      ...currentQuestValues,
      rewardRules: buildRuleFormEntries(categoryIds, currentQuestValues.rewardRules),
      penaltyRules: buildRuleFormEntries(categoryIds, currentQuestValues.penaltyRules),
    })

    const currentRewardValues = rewardForm.getValues()
    rewardForm.reset({
      ...currentRewardValues,
      costs: buildRuleFormEntries(categoryIds, currentRewardValues.costs),
    })

    const currentEditQuestValues = editQuestForm.getValues()
    editQuestForm.reset({
      ...currentEditQuestValues,
      rewardRules: buildRuleFormEntries(categoryIds, currentEditQuestValues.rewardRules),
      penaltyRules: buildRuleFormEntries(categoryIds, currentEditQuestValues.penaltyRules),
    })

    const currentEditRewardValues = editRewardForm.getValues()
    editRewardForm.reset({
      ...currentEditRewardValues,
      costs: buildRuleFormEntries(categoryIds, currentEditRewardValues.costs),
    })
  }, [categoryIdsKey, editQuestForm, editRewardForm, questForm, rewardForm, categoryIds])

  const studioStats = useMemo(() => ([
    {
      label: 'Players',
      value: bootstrap.onboarding.playerCount,
      detail: 'Active player accounts',
    },
    {
      label: 'Kudos',
      value: bootstrap.onboarding.categoryCount,
      detail: 'Game-style point tracks',
    },
    {
      label: 'Quests',
      value: bootstrap.catalogCounts.tasks,
      detail: 'Playable quest definitions',
    },
    {
      label: 'Rewards',
      value: bootstrap.catalogCounts.rewards,
      detail: 'Spendable reward items',
    },
  ]), [
    bootstrap.onboarding.playerCount,
    bootstrap.onboarding.categoryCount,
    bootstrap.catalogCounts.tasks,
    bootstrap.catalogCounts.rewards,
  ])

  const adminTasksQuery = useQuery({
    queryKey: ['admin-tasks', questCatalogPage, deferredQuestCatalogSearch],
    queryFn: () => api.getAdminTasks({
      page: questCatalogPage,
      pageSize: 10,
      search: deferredQuestCatalogSearch,
    }),
    enabled: resolvedActiveSection === 'quests',
  })

  const adminRewardsQuery = useQuery({
    queryKey: ['admin-rewards', rewardCatalogPage, deferredRewardCatalogSearch],
    queryFn: () => api.getAdminRewards({
      page: rewardCatalogPage,
      pageSize: 10,
      search: deferredRewardCatalogSearch,
    }),
    enabled: resolvedActiveSection === 'rewards',
  })

  useEffect(() => {
    const totalPages = adminTasksQuery.data?.totalPages
    if (totalPages !== undefined && questCatalogPage > Math.max(totalPages, 1)) {
      setQuestCatalogPage(Math.max(totalPages, 1))
    }
  }, [adminTasksQuery.data?.totalPages, questCatalogPage])

  useEffect(() => {
    const totalPages = adminRewardsQuery.data?.totalPages
    if (totalPages !== undefined && rewardCatalogPage > Math.max(totalPages, 1)) {
      setRewardCatalogPage(Math.max(totalPages, 1))
    }
  }, [adminRewardsQuery.data?.totalPages, rewardCatalogPage])

  useEffect(() => {
    if (resolvedActiveSection !== 'rewards' || !focusedRewardId) {
      return
    }

    if (focusedRewardSearch && rewardCatalogSearch !== focusedRewardSearch) {
      setRewardCatalogSearch(focusedRewardSearch)
      setRewardCatalogPage(1)
      return
    }

    if (focusedRewardSearch && deferredRewardCatalogSearch !== focusedRewardSearch) {
      return
    }

    if (adminRewardsQuery.isLoading || adminRewardsQuery.isFetching) {
      return
    }

    const focusedReward = adminRewardsQuery.data?.items.find((item) => item.id === focusedRewardId) || null
    if (focusedReward) {
      setEditingReward(focusedReward)
    }

    onFocusedRewardHandled?.()
  }, [
    adminRewardsQuery.data?.items,
    adminRewardsQuery.isFetching,
    adminRewardsQuery.isLoading,
    deferredRewardCatalogSearch,
    focusedRewardId,
    focusedRewardSearch,
    onFocusedRewardHandled,
    resolvedActiveSection,
    rewardCatalogSearch,
  ])

  const invalidateAdmin = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-bootstrap'] }),
      queryClient.invalidateQueries({ queryKey: ['session'] }),
      queryClient.invalidateQueries({ queryKey: ['public-config'] }),
      queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      queryClient.invalidateQueries({ queryKey: ['rewards'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-rewards'] }),
    ])
  }

  const createPlayerMutation = useMutation({
    mutationFn: api.createPlayer,
    onSuccess: async () => {
      playerForm.reset({
        displayName: '',
        username: '',
        temporaryPassword: '',
      })
      await invalidateAdmin()
      toast.success('Player created')
    },
    onError: handleMutationError,
  })

  const resetPasswordMutation = useMutation({
    mutationFn: ({ playerId, temporaryPassword }: { playerId: number; temporaryPassword: string }) =>
      api.resetPlayerPassword(playerId, { temporaryPassword }),
    onSuccess: async () => {
      await invalidateAdmin()
      toast.success('Temporary password reset')
    },
    onError: handleMutationError,
  })

  const deletePlayerMutation = useMutation({
    mutationFn: api.deletePlayer,
    onSuccess: async () => {
      await invalidateAdmin()
      toast.success('Player deleted')
    },
    onError: handleMutationError,
  })

  const updatePlayerBalancesMutation = useMutation({
    mutationFn: ({ playerId, balances }: { playerId: number; balances: Array<{ categoryId: number; balance: string }> }) =>
      api.updatePlayerBalances(playerId, toUpdatePlayerBalancesPayload({ balances })),
    onSuccess: async () => {
      await invalidateAdmin()
      toast.success('Player kudos updated')
    },
    onError: handleMutationError,
  })

  const createCategoryMutation = useMutation({
    mutationFn: api.createCategory,
    onSuccess: async () => {
      categoryForm.reset({
        name: '',
        description: '',
        color: '#1f2937',
        icon: '',
      })
      await invalidateAdmin()
      toast.success('Kudos track added')
    },
    onError: handleMutationError,
  })

  const updateCategoryMutation = useMutation({
    mutationFn: ({ categoryId, payload }: { categoryId: number; payload: ReturnType<typeof toUpdateCategoryAppearancePayload> }) =>
      api.updateCategory(categoryId, payload),
    onSuccess: async () => {
      setEditingCategory(null)
      await invalidateAdmin()
      toast.success('Kudos track updated')
    },
    onError: handleMutationError,
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: api.deleteCategory,
    onSuccess: async () => {
      setEditingCategory(null)
      await invalidateAdmin()
      toast.success('Kudos track deleted')
    },
    onError: handleMutationError,
  })

  const updateSettingsMutation = useMutation({
    mutationFn: api.updateSettings,
    onSuccess: async () => {
      await invalidateAdmin()
      toast.success('Branding saved')
    },
    onError: handleMutationError,
  })

  const createQuestMutation = useMutation({
    mutationFn: api.createTask,
    onSuccess: async () => {
      questForm.reset(getQuestDefaults(categoryIds))
      await invalidateAdmin()
      toast.success('Quest created')
    },
    onError: handleMutationError,
  })

  const updateQuestMutation = useMutation({
    mutationFn: ({ taskId, payload }: { taskId: number; payload: ReturnType<typeof toCreateTaskPayload> }) =>
      api.updateTask(taskId, payload),
    onSuccess: async () => {
      setEditingTask(null)
      editQuestForm.reset(getQuestDefaults(categoryIds))
      await invalidateAdmin()
      toast.success('Quest updated')
    },
    onError: handleMutationError,
  })

  const deleteQuestMutation = useMutation({
    mutationFn: api.deleteTask,
    onSuccess: async () => {
      setEditingTask(null)
      editQuestForm.reset(getQuestDefaults(categoryIds))
      await invalidateAdmin()
      toast.success('Quest deleted')
    },
    onError: handleMutationError,
  })

  const createRewardMutation = useMutation({
    mutationFn: api.createReward,
    onSuccess: async () => {
      rewardForm.reset(getRewardDefaults(categoryIds))
      await invalidateAdmin()
      toast.success('Reward created')
    },
    onError: handleMutationError,
  })

  const updateRewardMutation = useMutation({
    mutationFn: ({ rewardId, payload }: { rewardId: number; payload: ReturnType<typeof toCreateRewardPayload> }) =>
      api.updateReward(rewardId, payload),
    onSuccess: async () => {
      setEditingReward(null)
      editRewardForm.reset(getRewardDefaults(categoryIds))
      await invalidateAdmin()
      toast.success('Reward updated')
    },
    onError: handleMutationError,
  })

  const deleteRewardMutation = useMutation({
    mutationFn: api.deleteReward,
    onSuccess: async () => {
      setEditingReward(null)
      editRewardForm.reset(getRewardDefaults(categoryIds))
      await invalidateAdmin()
      toast.success('Reward deleted')
    },
    onError: handleMutationError,
  })

  const sectionViews: Record<AdminSection, ReactNode> = {
    players: (
      <AdminStudioPlayersSection
        bootstrap={bootstrap}
        playerForm={playerForm}
        createPlayerPending={createPlayerMutation.isPending}
        deletePlayerPending={deletePlayerMutation.isPending}
        resetPasswordPending={resetPasswordMutation.isPending}
        onCreatePlayer={(values) => createPlayerMutation.mutate(values)}
        onDeletePlayer={(playerId) => deletePlayerMutation.mutateAsync(playerId)}
        onResetPassword={(playerId, temporaryPassword) => resetPasswordMutation.mutateAsync({ playerId, temporaryPassword })}
      />
    ),
    categories: (
      <AdminStudioCategoriesSection
        bootstrap={bootstrap}
        players={players}
        playerBalancesById={playerBalancesById}
        categoryForm={categoryForm}
        createCategoryPending={createCategoryMutation.isPending}
        updateCategoryPending={updateCategoryMutation.isPending}
        deleteCategoryPending={deleteCategoryMutation.isPending}
        updatePlayerBalancesPending={updatePlayerBalancesMutation.isPending}
        onCreateCategory={(values) => createCategoryMutation.mutate(toCreateCategoryPayload(values))}
        onEditCategory={(categoryId) => {
          const category = bootstrap.categories.find((item) => item.id === categoryId) ?? null
          setEditingCategory(category)
        }}
        onDeleteCategory={(categoryId) => {
          const category = bootstrap.categories.find((item) => item.id === categoryId)
          if (!category) {
            return
          }

          if (!window.confirm(`Delete ${category.name}? This only works when it is no longer used by quests or rewards and all balances are zero.`)) {
            return
          }

          deleteCategoryMutation.mutate(categoryId)
        }}
        onUpdatePlayerBalances={(playerId, balances) => updatePlayerBalancesMutation.mutateAsync({
          playerId,
          balances,
        })}
      />
    ),
    branding: (
      <AdminStudioBrandingSection
        bootstrap={bootstrap}
        settingsForm={settingsForm}
        settingsContentErrors={settingsContentErrors}
        resolvedPreviewSettingsValues={resolvedPreviewSettingsValues}
        updateSettingsPending={updateSettingsMutation.isPending}
        onSubmit={(values) => updateSettingsMutation.mutate(values)}
      />
    ),
    quests: (
      <AdminStudioQuestsSection
        categories={categories}
        players={players.map((player) => ({ id: player.id, displayName: player.displayName }))}
        questForm={questForm}
        questAssignmentMode={questAssignmentMode}
        questSelectedUserIds={questSelectedUserIds}
        createQuestPending={createQuestMutation.isPending}
        editingTask={editingTask}
        adminTasks={adminTasksQuery.data}
        adminTasksLoading={adminTasksQuery.isLoading}
        questCatalogPage={questCatalogPage}
        questCatalogSearch={questCatalogSearch}
        onSetQuestAssignmentMode={(assignmentMode) => questForm.setValue('assignmentMode', assignmentMode, { shouldDirty: true, shouldValidate: true })}
        onToggleQuestUser={(userId) => questForm.setValue(
          'userIds',
          questSelectedUserIds.includes(userId)
            ? questSelectedUserIds.filter((value) => value !== userId)
            : [...questSelectedUserIds, userId],
          { shouldDirty: true, shouldValidate: true },
        )}
        onCreateQuest={(values) => createQuestMutation.mutate(toCreateTaskPayload(values))}
        onQuestPageChange={setQuestCatalogPage}
        onQuestSearchChange={setQuestCatalogSearch}
        onEditTask={setEditingTask}
        onDeleteTask={(taskId) => deleteQuestMutation.mutate(taskId)}
        onToggleTaskVisibility={(task, nextActive) => {
          updateQuestMutation.mutate({
            taskId: task.id,
            payload: {
              ...toTaskPayloadFromTask(task),
              isActive: nextActive,
            },
          })
        }}
      />
    ),
    rewards: (
      <AdminStudioRewardsSection
        categories={categories}
        players={players.map((player) => ({ id: player.id, displayName: player.displayName }))}
        rewardForm={rewardForm}
        rewardAssignmentMode={rewardAssignmentMode}
        rewardSelectedUserIds={rewardSelectedUserIds}
        createRewardPending={createRewardMutation.isPending}
        editingReward={editingReward}
        adminRewards={adminRewardsQuery.data}
        adminRewardsLoading={adminRewardsQuery.isLoading}
        rewardCatalogPage={rewardCatalogPage}
        rewardCatalogSearch={rewardCatalogSearch}
        onSetRewardAssignmentMode={(assignmentMode) => rewardForm.setValue('assignmentMode', assignmentMode, { shouldDirty: true, shouldValidate: true })}
        onToggleRewardUser={(userId) => rewardForm.setValue(
          'userIds',
          rewardSelectedUserIds.includes(userId)
            ? rewardSelectedUserIds.filter((value) => value !== userId)
            : [...rewardSelectedUserIds, userId],
          { shouldDirty: true, shouldValidate: true },
        )}
        onCreateReward={(values) => createRewardMutation.mutate(toCreateRewardPayload(values))}
        onRewardPageChange={setRewardCatalogPage}
        onRewardSearchChange={setRewardCatalogSearch}
        onEditReward={setEditingReward}
        onDeleteReward={(rewardId) => deleteRewardMutation.mutate(rewardId)}
        onToggleRewardVisibility={(reward, nextActive) => {
          updateRewardMutation.mutate({
            rewardId: reward.id,
            payload: {
              ...toRewardPayloadFromReward(reward),
              isActive: nextActive,
            },
          })
        }}
      />
    ),
  }

  const activeSectionInfo = adminSectionMeta.find((section) => section.id === resolvedActiveSection) || adminSectionMeta[0]
  const activeSectionIndex = Math.max(getSectionIndex(resolvedActiveSection), 0)

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-[1.75rem] border-border/70 bg-[linear-gradient(135deg,var(--hero-from),var(--hero-via),var(--hero-to))]">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="theme-shell-pill rounded-full px-4 py-1">
              Admin studio
            </Badge>
            <Badge className="theme-shell-pill rounded-full px-4 py-1">
              {bootstrap.settings.theme.name}
            </Badge>
            {!bootstrap.setup.isLaunched ? (
              <Badge className="theme-shell-pill rounded-full px-4 py-1">
                Setup in progress
              </Badge>
            ) : null}
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl">
              Manage the platform without digging through tabs
            </CardTitle>
            <CardDescription className="theme-shell-muted max-w-3xl text-base leading-7">
              Players, categories, quests, rewards, and branding all live in one place. The dedicated onboarding shell handles first-run launch, while this studio stays available for direct editing at any time.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-8 flex gap-4 overflow-x-auto pb-1 md:grid md:grid-cols-4 md:overflow-visible md:pb-0">
          {studioStats.map((item) => (
            <div key={item.label} className="theme-shell-card min-w-[12rem] rounded-[1.5rem] p-4 md:min-w-0">
              <p className="theme-shell-muted text-sm">{item.label}</p>
              <p className="mt-1 text-2xl font-semibold">{item.value}</p>
              <p className="theme-shell-muted mt-1 text-sm">{item.detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem] border-primary/20 bg-primary/5">
        <CardHeader className="gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <activeSectionInfo.icon className="size-5 text-primary" />
              Current section: {activeSectionInfo.label}
            </CardTitle>
            <CardDescription>{activeSectionInfo.description}</CardDescription>
          </div>
          <p className="text-sm text-muted-foreground">
            Section {activeSectionIndex + 1} of {adminSectionMeta.length}
          </p>
        </CardHeader>
      </Card>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {adminSectionMeta.map((section) => (
          <Button
            key={section.id}
            className="min-h-11 shrink-0"
            variant={resolvedActiveSection === section.id ? 'default' : 'outline'}
            onClick={() => onSectionChange(section.id)}
          >
            <section.icon className="mr-2 size-4" />
            {section.label}
          </Button>
        ))}
      </div>

      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={resolvedActiveSection}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -8, filter: 'blur(4px)' }}
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12, filter: 'blur(6px)' }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {sectionViews[resolvedActiveSection]}
        </motion.div>
      </AnimatePresence>

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
        onSubmit={(values) => {
          if (!editingCategory) {
            return
          }

          updateCategoryMutation.mutate({
            categoryId: editingCategory.id,
            payload: toUpdateCategoryAppearancePayload(values),
          })
        }}
      />

      <Dialog open={Boolean(editingTask)} onOpenChange={(open) => {
        if (!open) {
          setEditingTask(null)
        }
      }}>
        <BaseModalContent className="flex overflow-hidden" size="editor">
          <BaseModalHeader
            title="Edit quest"
            description="Update the quest details, assignment, values, and visibility without touching the create form."
          />
          {editingTask ? (
            <form
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
              onSubmit={editQuestForm.handleSubmit((values) => {
                updateQuestMutation.mutate({
                  taskId: editingTask.id,
                    payload: toCreateTaskPayload(values),
                })
              })}
            >
              <BaseModalBody scrollable>
                <div className="space-y-8">
                  <QuestEditorFields
                    categories={categories}
                    form={editQuestForm}
                    players={players.map((player) => ({ id: player.id, displayName: player.displayName }))}
                  />
                </div>
              </BaseModalBody>
              <BaseModalFooter className="flex-wrap">
                <Button type="button" variant="outline" onClick={() => setEditingTask(null)}>
                  Cancel
                </Button>
                <Button disabled={updateQuestMutation.isPending} type="submit">
                  Save quest changes
                </Button>
              </BaseModalFooter>
            </form>
          ) : null}
        </BaseModalContent>
      </Dialog>

      <Dialog open={Boolean(editingReward)} onOpenChange={(open) => {
        if (!open) {
          setEditingReward(null)
        }
      }}>
        <BaseModalContent className="flex overflow-hidden" size="editor">
          <BaseModalHeader
            title="Edit reward"
            description="Update the reward details, costs, assignment, and visibility in a dedicated editor."
          />
          {editingReward ? (
            <form
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
              onSubmit={editRewardForm.handleSubmit((values) => {
                updateRewardMutation.mutate({
                  rewardId: editingReward.id,
                    payload: toCreateRewardPayload(values),
                })
              })}
            >
              <BaseModalBody scrollable>
                <div className="space-y-8">
                  <RewardEditorFields
                    categories={categories}
                    form={editRewardForm}
                    players={players.map((player) => ({ id: player.id, displayName: player.displayName }))}
                  />
                </div>
              </BaseModalBody>
              <BaseModalFooter className="flex-wrap">
                <Button type="button" variant="outline" onClick={() => setEditingReward(null)}>
                  Cancel
                </Button>
                <Button disabled={updateRewardMutation.isPending} type="submit">
                  Save reward changes
                </Button>
              </BaseModalFooter>
            </form>
          ) : null}
        </BaseModalContent>
      </Dialog>
    </div>
  )
}

function handleMutationError(error: unknown) {
  const message = error instanceof ApiError ? error.message : 'Action failed'
  toast.error(message)
}
