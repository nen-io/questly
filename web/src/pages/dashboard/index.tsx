import { useDeferredValue, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { useIsFetching, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Crown, Shield, Sparkles, Trophy, Users } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useLocation, useNavigate } from 'react-router-dom'

import {
  completeTaskFormSchema,
  createActivityCommentFormSchema,
  toCompleteTaskPayload,
  toUpdateEmailSettingsPayload,
  updateEmailSettingsFormSchema,
} from '@/schemas/forms'
import {
  adminSectionPath,
  dashboardTabPath,
  rewardDetailPath,
  resolveDashboardRoute,
  taskDetailPath,
  type DashboardTab,
} from '@/routes/app'
import { ThemeAtmosphere } from '@/components/theme/theme-atmosphere'
import { Badge } from '@/components/ui/badge'
import { makeZodResolver } from '@/lib/zod-resolver'
import { api, ApiError } from '@/api/client'
import type { ActivityEvent, NotificationItem, PlayerTask, SessionData } from '@/types/app'
import {
  CompletionDialog,
  DashboardAccountMenu,
  DashboardCelebrationOverlay,
  MobileDockNav,
} from './components'
import { useClampPage, useDashboardCelebration } from './hooks'
import { dashboardTabMeta } from './meta'
import {
  ActivitySection,
  AdminSectionView,
  NotificationsSection,
  OverviewSection,
  RewardsSection,
  SettingsSection,
  TasksSection,
  WinsSection,
} from './sections'
import {
  buildQuestCompletedCelebration,
  buildRewardPurchasedCelebration,
  buildRewardRedeemedCelebration,
  ensureArray,
  findCelebrationRewardById,
  findCelebrationRewardByPurchaseId,
  normalizeLeaderboardEntries,
  resolveActivityDestination,
  resolveNotificationDestination,
  type DashboardDestination,
} from './utils'

interface DashboardProps {
  session: SessionData
}

export function Dashboard({ session }: DashboardProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const shouldReduceMotion = useReducedMotion()
  const { activeCelebration, dismissCelebration, triggerCelebration } = useDashboardCelebration()
  const [completionTarget, setCompletionTarget] = useState<PlayerTask | null>(null)
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null)
  const [pinnedNotificationRunId, setPinnedNotificationRunId] = useState<number | null>(null)
  const [selectedMediaId, setSelectedMediaId] = useState<number | null>(null)
  const [taskSearch, setTaskSearch] = useState('')
  const [rewardSearch, setRewardSearch] = useState('')
  const [selectedTaskCategoryIds, setSelectedTaskCategoryIds] = useState<number[]>([])
  const [selectedRewardCategoryIds, setSelectedRewardCategoryIds] = useState<number[]>([])
  const [taskActivePage, setTaskActivePage] = useState(1)
  const [taskAvailablePage, setTaskAvailablePage] = useState(1)
  const [rewardOwnedPage, setRewardOwnedPage] = useState(1)
  const [rewardAvailablePage, setRewardAvailablePage] = useState(1)
  const [winsSearch, setWinsSearch] = useState('')
  const [winsPlayerFilter, setWinsPlayerFilter] = useState<string>('all')
  const [winsPage, setWinsPage] = useState(1)
  const [leaderboardPage, setLeaderboardPage] = useState(1)
  const [activityPage, setActivityPage] = useState(1)
  const [commentsPage, setCommentsPage] = useState(1)
  const [now, setNow] = useState(() => Date.now())
  const [avatarDraft, setAvatarDraft] = useState<string | null>(session.user.avatarUrl)
  const emailSettingsForm = useForm({
    resolver: makeZodResolver(updateEmailSettingsFormSchema),
    defaultValues: {
      email: session.profile.email || '',
      emailNotificationsEnabled: session.profile.emailNotificationsEnabled,
      inAppNotificationsEnabled: session.profile.inAppNotificationsEnabled,
    },
  })
  const commentForm = useForm({
    resolver: makeZodResolver(createActivityCommentFormSchema),
    defaultValues: {
      body: '',
    },
  })
  const completionForm = useForm({
    resolver: makeZodResolver(completeTaskFormSchema),
    defaultValues: {
      notes: '',
      files: [] as File[],
    },
  })
  const playerRoster = useMemo(
    () => session.platform.players.filter((player) => player.role === 'player'),
    [session.platform.players],
  )
  const hasLeaderboard = playerRoster.length > 1
  const visibleTabs = useMemo(() => {
    const tabs: DashboardTab[] = ['overview']
    if (session.user.role !== 'admin') {
      tabs.push('tasks', 'rewards')
    }
    tabs.push('wins', 'activity', 'notifications')
    if (session.user.role === 'admin') {
      tabs.push('admin')
    }
    return tabs
  }, [session.user.role])
  const routeState = useMemo(() => resolveDashboardRoute({
    pathname: location.pathname,
    hasLeaderboard,
    isAdmin: session.user.role === 'admin',
  }), [hasLeaderboard, location.pathname, session.user.role])
  const activeTab = routeState.tab
  const activeAdminSection = routeState.adminSection
  const detailSlug = routeState.detailSlug
  const locationSearchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const deferredTaskSearch = useDeferredValue(taskSearch.trim())
  const deferredRewardSearch = useDeferredValue(rewardSearch.trim())
  const deferredWinsSearch = useDeferredValue(winsSearch.trim())
  const winsPlayerId = winsPlayerFilter === 'all' ? null : Number(winsPlayerFilter)
  const focusedAdminRewardId = useMemo(() => {
    if (activeTab !== 'admin' || activeAdminSection !== 'rewards') {
      return null
    }

    const rawValue = locationSearchParams.get('focusRewardId')
    if (!rawValue || !/^\d+$/.test(rawValue)) {
      return null
    }

    const parsed = Number(rawValue)
    return parsed > 0 ? parsed : null
  }, [activeAdminSection, activeTab, locationSearchParams])
  const focusedAdminRewardSearch = useMemo(() => {
    if (activeTab !== 'admin' || activeAdminSection !== 'rewards') {
      return ''
    }

    return locationSearchParams.get('focusRewardSearch')?.trim() ?? ''
  }, [activeAdminSection, activeTab, locationSearchParams])
  const sessionRefreshCount = useIsFetching({ queryKey: ['session'] })
  const isSessionRefreshing = sessionRefreshCount > 0
  const hasAvatarChanges = avatarDraft !== session.user.avatarUrl

  useEffect(() => {
    emailSettingsForm.reset({
      email: session.profile.email || '',
      emailNotificationsEnabled: session.profile.emailNotificationsEnabled,
      inAppNotificationsEnabled: session.profile.inAppNotificationsEnabled,
    })
  }, [emailSettingsForm, session.profile])

  useEffect(() => {
    setAvatarDraft(session.user.avatarUrl)
  }, [session.user.avatarUrl])

  useEffect(() => {
    if (location.pathname !== routeState.canonicalPath) {
      navigate(routeState.canonicalPath, { replace: true })
    }
  }, [location.pathname, navigate, routeState.canonicalPath])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    setTaskActivePage(1)
    setTaskAvailablePage(1)
  }, [deferredTaskSearch, selectedTaskCategoryIds])

  useEffect(() => {
    setRewardOwnedPage(1)
    setRewardAvailablePage(1)
  }, [deferredRewardSearch, selectedRewardCategoryIds])

  useEffect(() => {
    setWinsPage(1)
  }, [deferredWinsSearch, winsPlayerFilter])

  const activeTasksQuery = useQuery({
    queryKey: ['tasks', 'active', taskActivePage, deferredTaskSearch, selectedTaskCategoryIds],
    queryFn: () => api.getTasks({
      collection: 'active',
      page: taskActivePage,
      pageSize: 6,
      search: deferredTaskSearch,
      categoryIds: selectedTaskCategoryIds,
    }),
    enabled: activeTab === 'tasks' && !detailSlug,
  })
  const availableTasksQuery = useQuery({
    queryKey: ['tasks', 'available', taskAvailablePage, deferredTaskSearch, selectedTaskCategoryIds],
    queryFn: () => api.getTasks({
      collection: 'available',
      page: taskAvailablePage,
      pageSize: 6,
      search: deferredTaskSearch,
      categoryIds: selectedTaskCategoryIds,
    }),
    enabled: activeTab === 'tasks' && !detailSlug,
  })
  const selectedTaskQuery = useQuery({
    queryKey: ['task-detail', detailSlug],
    queryFn: () => api.getTaskBySlug(detailSlug!),
    enabled: activeTab === 'tasks' && Boolean(detailSlug),
  })
  const ownedRewardsQuery = useQuery({
    queryKey: ['rewards', 'owned', rewardOwnedPage, deferredRewardSearch, selectedRewardCategoryIds],
    queryFn: () => api.getRewards({
      collection: 'owned',
      page: rewardOwnedPage,
      pageSize: 6,
      search: deferredRewardSearch,
      categoryIds: selectedRewardCategoryIds,
    }),
    enabled: activeTab === 'rewards' && !detailSlug,
  })
  const availableRewardsQuery = useQuery({
    queryKey: ['rewards', 'available', rewardAvailablePage, deferredRewardSearch, selectedRewardCategoryIds],
    queryFn: () => api.getRewards({
      collection: 'available',
      page: rewardAvailablePage,
      pageSize: 6,
      search: deferredRewardSearch,
      categoryIds: selectedRewardCategoryIds,
    }),
    enabled: activeTab === 'rewards' && !detailSlug,
  })
  const selectedRewardQuery = useQuery({
    queryKey: ['reward-detail', detailSlug],
    queryFn: () => api.getRewardBySlug(detailSlug!),
    enabled: activeTab === 'rewards' && Boolean(detailSlug),
  })
  const purchasesQuery = useQuery({
    queryKey: ['reward-purchases'],
    queryFn: api.getRewardPurchases,
    enabled: session.user.role !== 'admin' && (activeTab === 'rewards' || activeTab === 'overview'),
  })
  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: api.getNotifications,
    enabled: activeTab === 'notifications',
  })
  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard', leaderboardPage],
    queryFn: () => api.getLeaderboard({ page: leaderboardPage, pageSize: 10 }),
    enabled: hasLeaderboard && (activeTab === 'leaderboard' || activeTab === 'overview'),
  })
  const winsQuery = useQuery({
    queryKey: ['activity-runs', winsPage, deferredWinsSearch, winsPlayerId],
    queryFn: () => api.getActivityRuns({
      page: winsPage,
      pageSize: 10,
      search: deferredWinsSearch,
      playerId: winsPlayerId,
    }),
    enabled: activeTab === 'wins',
  })
  const pinnedRunQuery = useQuery({
    queryKey: ['activity-run', pinnedNotificationRunId],
    queryFn: () => api.getActivityRun(pinnedNotificationRunId!),
    enabled: activeTab === 'wins'
      && Boolean(pinnedNotificationRunId)
      && pinnedNotificationRunId === selectedRunId
      && !ensureArray(winsQuery.data?.items).some((run) => run.id === pinnedNotificationRunId),
  })
  const activityFeedQuery = useQuery({
    queryKey: ['activity-feed', activityPage],
    queryFn: () => api.getActivityFeed({ page: activityPage, pageSize: 12 }),
    enabled: activeTab === 'activity',
  })
  const activityCommentsQuery = useQuery({
    queryKey: ['activity-comments', selectedRunId, commentsPage],
    queryFn: () => api.getActivityRunComments(selectedRunId!, { page: commentsPage, pageSize: 20 }),
    enabled: activeTab === 'wins' && Boolean(selectedRunId),
  })
  const activityMediaQuery = useQuery({
    queryKey: ['activity-media', selectedRunId],
    queryFn: () => api.getActivityRunMedia(selectedRunId!),
    enabled: activeTab === 'wins' && Boolean(selectedRunId),
  })
  const adminBootstrapQuery = useQuery({
    queryKey: ['admin-bootstrap'],
    queryFn: api.getAdminBootstrap,
    enabled: session.user.role === 'admin' && activeTab === 'admin',
  })

  const refreshSharedQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['session'] }),
      queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      queryClient.invalidateQueries({ queryKey: ['task-detail'] }),
      queryClient.invalidateQueries({ queryKey: ['rewards'] }),
      queryClient.invalidateQueries({ queryKey: ['reward-detail'] }),
      queryClient.invalidateQueries({ queryKey: ['reward-purchases'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      queryClient.invalidateQueries({ queryKey: ['activity-run'] }),
      queryClient.invalidateQueries({ queryKey: ['activity-runs'] }),
      queryClient.invalidateQueries({ queryKey: ['activity-media'] }),
      queryClient.invalidateQueries({ queryKey: ['activity-comments'] }),
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] }),
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-bootstrap'] }),
      queryClient.invalidateQueries({ queryKey: ['public-config'] }),
    ])
  }

  const logoutMutation = useMutation({
    mutationFn: api.logout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] })
      toast.success('Signed out')
    },
  })
  const startTaskMutation = useMutation({
    mutationFn: api.startTask,
    onSuccess: async () => {
      await refreshSharedQueries()
      toast.success('Quest started')
    },
    onError: handleMutationError,
  })
  const queueTaskRunMediaMutation = useMutation({
    mutationFn: ({ runId, files }: { runId: number; files: File[] }) => api.uploadTaskRunMedia(runId, files),
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    onSuccess: async (result) => {
      if (result.failedCount > 0) {
        toast.error(
          result.failedCount === 1
            ? '1 attachment could not be queued for background processing.'
            : `${result.failedCount} attachments could not be queued for background processing.`,
        )
      }

      if (result.queuedCount <= 0) {
        return
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['activity-runs'] }),
        queryClient.invalidateQueries({ queryKey: ['activity-run'] }),
        queryClient.invalidateQueries({ queryKey: ['activity-media'] }),
      ])
    },
    onError: (error) => {
      const message = error instanceof ApiError
        ? `Quest completed, but background media upload failed to start: ${error.message}`
        : 'Quest completed, but background media upload failed to start'
      toast.error(message)
    },
  })
  const completeTaskMutation = useMutation({
    mutationFn: ({ taskId, notes }: { taskId: number; notes?: string | null; files: File[] }) =>
      api.completeTask(taskId, { notes }),
    onSuccess: async (result, variables) => {
      const completedTask = completionTarget?.id === variables.taskId
        ? completionTarget
        : selectedTask?.id === variables.taskId
          ? selectedTask
          : [...activeTasks, ...availableTasks].find((task) => task.id === variables.taskId) || null

      setCompletionTarget(null)
      completionForm.reset({
        notes: '',
        files: [],
      })

      if (completedTask) {
        triggerCelebration(buildQuestCompletedCelebration(completedTask))
      }

      if (variables.files.length > 0) {
        queueTaskRunMediaMutation.mutate({
          runId: result.runId,
          files: variables.files,
        })
      }

      await refreshSharedQueries()
      if (result.mediaProcessing.status === 'failed') {
        toast.error('Quest completed, but attachment processing could not be queued on the server')
        return
      }

      if (variables.files.length > 0) {
        toast.success(
          variables.files.length === 1
            ? 'Quest completed. Attachment upload continues in the background.'
            : `Quest completed. ${variables.files.length} attachments continue in the background.`,
        )
        return
      }

      if (result.mediaProcessing.status === 'queued' && result.mediaProcessing.queuedCount > 0) {
        toast.success(
          result.mediaProcessing.queuedCount === 1
            ? 'Quest completed. Attachment processing continues in the background.'
            : `Quest completed. ${result.mediaProcessing.queuedCount} attachments continue in the background.`,
        )
        return
      }

      toast.success('Quest completed')
    },
    onError: handleMutationError,
  })
  const purchaseRewardMutation = useMutation({
    mutationFn: api.purchaseReward,
    onSuccess: async (_result, rewardId) => {
      const purchasedReward = findCelebrationRewardById({
        availableRewards,
        ownedRewards,
        selectedReward,
      }, rewardId)

      if (purchasedReward) {
        triggerCelebration(buildRewardPurchasedCelebration(purchasedReward))
      }

      await refreshSharedQueries()
      toast.success('Reward purchased')
    },
    onError: handleMutationError,
  })
  const redeemRewardMutation = useMutation({
    mutationFn: api.redeemReward,
    onSuccess: async (_result, purchaseId) => {
      const redeemedReward = findCelebrationRewardByPurchaseId({
        availableRewards,
        ownedRewards,
        selectedReward,
      }, purchaseId)

      if (redeemedReward) {
        triggerCelebration(buildRewardRedeemedCelebration(redeemedReward))
      }

      await refreshSharedQueries()
      toast.success('Reward redeemed')
    },
    onError: handleMutationError,
  })
  const updateEmailMutation = useMutation({
    mutationFn: api.updateEmailSettings,
    onSuccess: async (result) => {
      await refreshSharedQueries()
      toast.success(result.verificationSent ? 'Email saved. Verification email sent.' : 'Notification settings saved.')
    },
    onError: handleMutationError,
  })
  const updateAvatarMutation = useMutation({
    mutationFn: api.updateAvatar,
    onSuccess: async (_result, payload) => {
      await refreshSharedQueries()
      toast.success(payload.avatarDataUrl ? 'Avatar updated' : 'Avatar removed')
    },
    onError: handleMutationError,
  })
  const requestVerificationMutation = useMutation({
    mutationFn: api.requestEmailVerification,
    onSuccess: (result) => {
      toast.success(result.alreadyVerified ? 'Email is already verified.' : 'Verification email sent.')
    },
    onError: handleMutationError,
  })
  const markNotificationReadMutation = useMutation({
    mutationFn: api.markNotificationRead,
    onSuccess: async () => {
      await refreshSharedQueries()
    },
    onError: handleMutationError,
  })
  const markAllNotificationsReadMutation = useMutation({
    mutationFn: api.markAllNotificationsRead,
    onSuccess: async () => {
      await refreshSharedQueries()
      toast.success('Notifications marked as read')
    },
    onError: handleMutationError,
  })
  const addCommentMutation = useMutation({
    mutationFn: ({ runId, body }: { runId: number; body: string }) => api.addActivityComment(runId, body),
    onSuccess: async () => {
      commentForm.reset({ body: '' })
      setCommentsPage(1)
      await refreshSharedQueries()
      toast.success('Comment added')
    },
    onError: handleMutationError,
  })

  const activeTasks = ensureArray(activeTasksQuery.data?.items)
  const availableTasks = ensureArray(availableTasksQuery.data?.items)
  const ownedRewards = ensureArray(ownedRewardsQuery.data?.items)
  const availableRewards = ensureArray(availableRewardsQuery.data?.items)
  const purchases = ensureArray(purchasesQuery.data)
  const notifications = ensureArray(notificationsQuery.data)
  const unreadNotifications = notificationsQuery.data
    ? notifications.filter((item) => !item.readAt).length
    : session.profile.unreadNotifications
  const leaderboard = useMemo(
    () => normalizeLeaderboardEntries(leaderboardQuery.data?.items),
    [leaderboardQuery.data?.items],
  )
  const winResults = ensureArray(winsQuery.data?.items)
  const activityFeed = ensureArray(activityFeedQuery.data?.items)
  const activityMedia = ensureArray(activityMediaQuery.data)
  const activityComments = ensureArray(activityCommentsQuery.data?.items)
  const selectedRun = winResults.find((run) => run.id === selectedRunId)
    || (pinnedNotificationRunId === selectedRunId ? pinnedRunQuery.data || null : null)
  const onlinePlayers = session.platform.players.filter((player) => player.online)
  const topLeaderboardPlayer = leaderboard[0] || null
  const ownedRewardCount = purchases.filter((purchase) => purchase.status === 'purchased').length
  const filterablePlayers = playerRoster
  const pointTracks = session.balances
  const selectedTask = activeTab === 'tasks' && detailSlug ? selectedTaskQuery.data || null : null
  const selectedReward = activeTab === 'rewards' && detailSlug ? selectedRewardQuery.data || null : null

  useClampPage(taskActivePage, activeTasksQuery.data?.totalPages, setTaskActivePage)
  useClampPage(taskAvailablePage, availableTasksQuery.data?.totalPages, setTaskAvailablePage)
  useClampPage(rewardOwnedPage, ownedRewardsQuery.data?.totalPages, setRewardOwnedPage)
  useClampPage(rewardAvailablePage, availableRewardsQuery.data?.totalPages, setRewardAvailablePage)
  useClampPage(winsPage, winsQuery.data?.totalPages, setWinsPage)
  useClampPage(leaderboardPage, leaderboardQuery.data?.totalPages, setLeaderboardPage)
  useClampPage(activityPage, activityFeedQuery.data?.totalPages, setActivityPage)
  useClampPage(commentsPage, activityCommentsQuery.data?.totalPages, setCommentsPage)

  useEffect(() => {
    if (activeTab === 'tasks' && detailSlug && !selectedTaskQuery.isLoading && !selectedTask) {
      navigate(dashboardTabPath('tasks'), { replace: true })
    }
    if (activeTab === 'rewards' && detailSlug && !selectedRewardQuery.isLoading && !selectedReward) {
      navigate(dashboardTabPath('rewards'), { replace: true })
    }
  }, [
    activeTab,
    detailSlug,
    navigate,
    selectedReward,
    selectedRewardQuery.isLoading,
    selectedTask,
    selectedTaskQuery.isLoading,
  ])

  useEffect(() => {
    if (activeTab !== 'wins') {
      return
    }

    const selectedRunIsInCurrentPage = Boolean(selectedRunId && winResults.some((run) => run.id === selectedRunId))
    const pinnedSelectionActive = pinnedNotificationRunId !== null && pinnedNotificationRunId === selectedRunId

    if (pinnedSelectionActive) {
      if (selectedRunIsInCurrentPage || pinnedRunQuery.data || pinnedRunQuery.isLoading) {
        return
      }

      if (winResults.length > 0) {
        setPinnedNotificationRunId(null)
        setSelectedRunId(winResults[0].id)
        return
      }

      setPinnedNotificationRunId(null)
      setSelectedRunId(null)
      return
    }

    if (winResults.length === 0) {
      setSelectedRunId(null)
      return
    }

    if (!selectedRunId || !selectedRunIsInCurrentPage) {
      setSelectedRunId(winResults[0].id)
    }
  }, [activeTab, pinnedNotificationRunId, pinnedRunQuery.data, pinnedRunQuery.isLoading, selectedRunId, winResults])

  useEffect(() => {
    setSelectedMediaId(activityMedia[0]?.id ?? null)
  }, [selectedRunId, activityMedia])

  useEffect(() => {
    setCommentsPage(1)
  }, [selectedRunId])

  useEffect(() => {
    commentForm.reset({ body: '' })
  }, [commentForm, selectedRunId])

  const closeCompletionDialog = () => {
    setCompletionTarget(null)
    completionForm.reset({
      notes: '',
      files: [],
    })
  }

  const openCompletionDialog = (task: PlayerTask) => {
    setCompletionTarget(task)
    completionForm.reset({
      notes: '',
      files: [],
    })
  }

  const toggleSelectedCategory = (
    setter: Dispatch<SetStateAction<number[]>>,
    categoryId: number,
  ) => {
    setter((current) => (
      current.includes(categoryId)
        ? current.filter((value) => value !== categoryId)
        : [...current, categoryId]
    ))
  }

  const stats = useMemo(() => ([
    { icon: Trophy, label: 'Completed quests', value: session.stats.completedCount.toString() },
    { icon: Sparkles, label: 'Active quests', value: session.stats.activeTasks.toString() },
    { icon: Users, label: 'Players', value: session.platform.onboarding.playerCount.toString() },
    { icon: Shield, label: 'Kudos', value: session.platform.onboarding.categoryCount.toString() },
  ]), [session])

  const navigateToTab = (tab: DashboardTab) => {
    if (tab === 'admin') {
      navigate(adminSectionPath(activeAdminSection ?? 'players'))
      return
    }

    navigate(dashboardTabPath(tab))
  }

  const navigateToDashboardDestination = (destination: DashboardDestination) => {
    if (destination.kind === 'win') {
      setPinnedNotificationRunId(destination.runId)
      setSelectedRunId(destination.runId)
      setWinsSearch('')
      setWinsPlayerFilter('all')
      setWinsPage(1)
      navigate(destination.path)
      return
    }

    navigate(destination.path)
  }

  const handleNotificationOpen = (notification: NotificationItem) => {
    if (!notification.readAt) {
      markNotificationReadMutation.mutate(notification.id)
    }

    navigateToDashboardDestination(resolveNotificationDestination(notification))
  }

  const handleActivityOpen = (event: ActivityEvent) => {
    if (
      session.user.role === 'admin'
      && (event.type === 'reward_purchased' || event.type === 'reward_redeemed')
      && event.rewardId
    ) {
      const searchParams = new URLSearchParams({
        focusRewardId: String(event.rewardId),
      })

      if (event.rewardTitle) {
        searchParams.set('focusRewardSearch', event.rewardTitle)
      }

      navigate({
        pathname: adminSectionPath('rewards'),
        search: `?${searchParams.toString()}`,
      })
      return
    }

    navigateToDashboardDestination(resolveActivityDestination(event))
  }

  const handleAdminRewardFocusHandled = () => {
    if (activeTab !== 'admin' || activeAdminSection !== 'rewards' || !location.search) {
      return
    }

    navigate({ pathname: adminSectionPath('rewards') }, { replace: true })
  }

  const handleWinsSearchChange = (value: string) => {
    setPinnedNotificationRunId(null)
    setWinsSearch(value)
  }

  const handleWinsPlayerFilterChange = (value: string) => {
    setPinnedNotificationRunId(null)
    setWinsPlayerFilter(value)
  }

  const handleWinsPageChange = (page: number) => {
    setPinnedNotificationRunId(null)
    setWinsPage(page)
  }

  const handleRunSelect = (runId: number) => {
    setPinnedNotificationRunId(null)
    setSelectedRunId(runId)
  }

  const activeContent = (() => {
    switch (activeTab) {
      case 'overview':
      case 'leaderboard':
        return (
          <OverviewSection
            activeTaskCount={session.stats.activeTasks}
            balances={session.balances}
            currentUserId={session.user.id}
            isAdmin={session.user.role === 'admin'}
            isSessionRefreshing={isSessionRefreshing}
            leaderboard={leaderboard}
            leaderboardIsLoading={leaderboardQuery.isLoading}
            leaderboardPage={leaderboardQuery.data?.page || 1}
            leaderboardTotalPages={leaderboardQuery.data?.totalPages || 1}
            onlinePlayers={onlinePlayers}
            ownedRewardCount={ownedRewardCount}
            playerCount={session.platform.onboarding.playerCount}
            topLeaderboardPlayer={topLeaderboardPlayer}
            onLeaderboardPageChange={setLeaderboardPage}
          />
        )
      case 'tasks':
        return (
          <TasksSection
            activeTasks={activeTasks}
            activeTasksIsLoading={activeTasksQuery.isLoading}
            activeTasksPage={activeTasksQuery.data?.page || 1}
            activeTasksTotalPages={activeTasksQuery.data?.totalPages || 1}
            availableTasks={availableTasks}
            availableTasksIsLoading={availableTasksQuery.isLoading}
            availableTasksPage={availableTasksQuery.data?.page || 1}
            availableTasksTotalPages={availableTasksQuery.data?.totalPages || 1}
            detailSlug={detailSlug}
            now={now}
            pointTracks={pointTracks}
            selectedTask={selectedTask}
            selectedTaskCategoryIds={selectedTaskCategoryIds}
            selectedTaskIsLoading={selectedTaskQuery.isLoading}
            taskSearch={taskSearch}
            onActivePageChange={setTaskActivePage}
            onAvailablePageChange={setTaskAvailablePage}
            onBackFromDetail={() => navigate(dashboardTabPath('tasks'))}
            onClearFilters={() => {
              setTaskSearch('')
              setSelectedTaskCategoryIds([])
            }}
            onOpenCompletion={openCompletionDialog}
            onOpenTask={(slug) => navigate(taskDetailPath(slug))}
            onStartTask={(taskId) => startTaskMutation.mutate(taskId)}
            onTaskCategoryToggle={(categoryId) => toggleSelectedCategory(setSelectedTaskCategoryIds, categoryId)}
            onTaskSearchChange={setTaskSearch}
          />
        )
      case 'rewards':
        return (
          <RewardsSection
            availableRewards={availableRewards}
            availableRewardsIsLoading={availableRewardsQuery.isLoading}
            availableRewardsPage={availableRewardsQuery.data?.page || 1}
            availableRewardsTotalPages={availableRewardsQuery.data?.totalPages || 1}
            detailSlug={detailSlug}
            now={now}
            ownedRewards={ownedRewards}
            ownedRewardsIsLoading={ownedRewardsQuery.isLoading}
            ownedRewardsPage={ownedRewardsQuery.data?.page || 1}
            ownedRewardsTotalPages={ownedRewardsQuery.data?.totalPages || 1}
            pointTracks={pointTracks}
            purchases={purchases}
            purchasesIsLoading={purchasesQuery.isLoading}
            rewardSearch={rewardSearch}
            selectedReward={selectedReward}
            selectedRewardCategoryIds={selectedRewardCategoryIds}
            selectedRewardIsLoading={selectedRewardQuery.isLoading}
            onAvailablePageChange={setRewardAvailablePage}
            onBackFromDetail={() => navigate(dashboardTabPath('rewards'))}
            onClearFilters={() => {
              setRewardSearch('')
              setSelectedRewardCategoryIds([])
            }}
            onOpenReward={(slug) => navigate(rewardDetailPath(slug))}
            onOwnedPageChange={setRewardOwnedPage}
            onPurchaseReward={(rewardId) => purchaseRewardMutation.mutate(rewardId)}
            onRedeemReward={(purchaseId) => redeemRewardMutation.mutate(purchaseId)}
            onRewardCategoryToggle={(categoryId) => toggleSelectedCategory(setSelectedRewardCategoryIds, categoryId)}
            onRewardSearchChange={setRewardSearch}
          />
        )
      case 'wins':
        return (
          <WinsSection
            activityComments={activityComments}
            activityCommentsIsLoading={activityCommentsQuery.isLoading}
            activityCommentsPage={activityCommentsQuery.data?.page || 1}
            activityCommentsTotal={activityCommentsQuery.data?.total || 0}
            activityCommentsTotalPages={activityCommentsQuery.data?.totalPages || 1}
            activityMedia={activityMedia}
            activityMediaIsLoading={activityMediaQuery.isLoading}
            commentForm={commentForm}
            filterablePlayers={filterablePlayers}
            isAddingComment={addCommentMutation.isPending}
            selectedMediaId={selectedMediaId}
            selectedRun={selectedRun}
            selectedRunId={selectedRunId}
            winResults={winResults}
            winsIsLoading={winsQuery.isLoading}
            winsPage={winsQuery.data?.page || 1}
            winsPlayerFilter={winsPlayerFilter}
            winsSearch={winsSearch}
            winsTotalPages={winsQuery.data?.totalPages || 1}
            onCommentSubmit={(values) => {
              if (!selectedRun) {
                return
              }

              addCommentMutation.mutate({ runId: selectedRun.id, body: values.body })
            }}
            onCommentsPageChange={setCommentsPage}
            onMediaSelect={setSelectedMediaId}
            onRunSelect={handleRunSelect}
            onWinsPageChange={handleWinsPageChange}
            onWinsPlayerFilterChange={handleWinsPlayerFilterChange}
            onWinsSearchChange={handleWinsSearchChange}
          />
        )
      case 'activity':
        return (
          <ActivitySection
            events={activityFeed}
            isLoading={activityFeedQuery.isLoading}
            onOpenEvent={handleActivityOpen}
            page={activityFeedQuery.data?.page || 1}
            totalPages={activityFeedQuery.data?.totalPages || 1}
            onPageChange={setActivityPage}
          />
        )
      case 'notifications':
        return (
          <NotificationsSection
            isLoading={notificationsQuery.isLoading}
            isMarkingAllRead={markAllNotificationsReadMutation.isPending}
            notifications={notifications}
            unreadCount={unreadNotifications}
            onMarkAllRead={() => markAllNotificationsReadMutation.mutate()}
            onOpenNotification={handleNotificationOpen}
          />
        )
      case 'settings':
        return (
          <SettingsSection
            avatarDraft={avatarDraft}
            avatarAsset={session.user.avatarAsset}
            avatarUrl={session.user.avatarUrl}
            displayName={session.user.displayName}
            email={session.profile.email}
            emailSettingsForm={emailSettingsForm}
            emailVerifiedAt={session.profile.emailVerifiedAt}
            isAvatarSaving={updateAvatarMutation.isPending}
            isEmailSaving={updateEmailMutation.isPending}
            isRequestingVerification={requestVerificationMutation.isPending}
            role={session.user.role}
            showAvatarActions={hasAvatarChanges}
            onAvatarChange={setAvatarDraft}
            onAvatarReset={() => setAvatarDraft(session.user.avatarUrl)}
            onAvatarSave={() => updateAvatarMutation.mutate({ avatarDataUrl: avatarDraft })}
            onEmailSave={(values) => updateEmailMutation.mutate(toUpdateEmailSettingsPayload(values))}
            onSendVerification={() => requestVerificationMutation.mutate()}
          />
        )
      case 'admin':
        return (
          <AdminSectionView
            activeSection={activeAdminSection}
            bootstrap={adminBootstrapQuery.data}
            focusedRewardId={focusedAdminRewardId}
            focusedRewardSearch={focusedAdminRewardSearch}
            isLoading={adminBootstrapQuery.isLoading}
            onFocusedRewardHandled={handleAdminRewardFocusHandled}
            onSectionChange={(section) => navigate(adminSectionPath(section))}
          />
        )
    }
  })()

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[var(--surface)] px-3 py-3 pb-28 sm:px-6 sm:py-6 sm:pb-8 lg:px-8">
      <ThemeAtmosphere themeKey={session.platform.theme.key} />
      <div className="relative mx-auto max-w-7xl space-y-6">
        <motion.section
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[2rem] border border-border/70 bg-[linear-gradient(140deg,var(--hero-from),var(--hero-via),var(--hero-to))] p-5 shadow-[0_24px_90px_rgba(15,23,42,0.08)] sm:p-8"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex justify-end">
            <DashboardAccountMenu
              avatarAsset={session.user.avatarAsset}
              avatarUrl={session.user.avatarUrl}
              displayName={session.user.displayName}
              isLoggingOut={logoutMutation.isPending}
              role={session.user.role}
              shouldReduceMotion={Boolean(shouldReduceMotion)}
              onLogout={() => logoutMutation.mutate()}
              onOpenSettings={() => navigateToTab('settings')}
            />
          </div>
          <div className="mt-5 flex flex-col gap-6">
            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge className="rounded-full bg-white/70 px-4 py-1 text-sm text-foreground shadow-sm">
                  {session.user.role === 'admin' ? 'Admin mode' : 'Player mode'}
                </Badge>
                <Badge className="rounded-full bg-white/70 px-4 py-1 text-sm text-foreground shadow-sm">
                  {unreadNotifications} unread notifications
                </Badge>
                {hasLeaderboard && topLeaderboardPlayer && (
                  <Badge className="rounded-full bg-white/70 px-4 py-1 text-sm text-foreground shadow-sm">
                    <Crown className="mr-2 inline size-3.5" />
                    {topLeaderboardPlayer.displayName} leads
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  {session.platform.platformName}
                </p>
                <h1 className="text-3xl leading-tight sm:text-5xl">
                  {session.platform.content.dashboardTitle}
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
                  {session.platform.content.dashboardMessage}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible md:pb-0 xl:grid-cols-4">
            {stats.map((item, index) => (
              <motion.div
                key={item.label}
                animate={{ opacity: 1, y: 0 }}
                className="min-w-[14rem] rounded-[1.5rem] border border-white/60 bg-white/70 px-5 py-4 backdrop-blur md:min-w-0"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
                transition={{
                  duration: shouldReduceMotion ? 0 : 0.28,
                  delay: shouldReduceMotion ? 0 : 0.04 * index,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={shouldReduceMotion ? undefined : { y: -4, scale: 1.01 }}
              >
                <div className="flex min-h-[6rem] flex-col justify-between">
                  <div className="space-y-3">
                    <item.icon className="size-5 text-primary" />
                    <p className="text-sm leading-5 text-muted-foreground">{item.label}</p>
                  </div>
                  <p className="retro-numeric pt-3 text-2xl leading-none font-semibold">{item.value}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <div className="space-y-4">
          <div className="hidden overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:block">
            <div className="mx-auto w-max min-w-full">
              <div className="flex items-center justify-center gap-2 rounded-[1.75rem] border border-border/60 bg-card/65 p-2 shadow-[0_18px_70px_rgba(15,23,42,0.06)] backdrop-blur">
                {visibleTabs.map((tab) => {
                  const meta = dashboardTabMeta[tab]
                  const Icon = meta.icon
                  const isActive = activeTab === tab

                  return (
                    <motion.button
                      key={tab}
                      type="button"
                      aria-current={isActive ? 'page' : undefined}
                      className={`retro-ui inline-flex min-w-[9.25rem] items-center justify-center gap-2 rounded-[1.15rem] px-4 py-3 text-sm font-medium whitespace-nowrap transition ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-[0_18px_35px_rgba(214,92,101,0.25)]'
                          : 'text-muted-foreground hover:bg-primary/8 hover:text-foreground'
                      }`}
                      whileHover={shouldReduceMotion ? undefined : { y: -2, scale: 1.01 }}
                      whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
                      onClick={() => navigateToTab(tab)}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span>{meta.label}</span>
                    </motion.button>
                  )
                })}
              </div>
            </div>
          </div>

          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={activeTab}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              className="min-h-[24rem] md:min-h-[32rem]"
              exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -10, filter: 'blur(4px)' }}
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 14, filter: 'blur(8px)' }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {activeContent}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="md:hidden">
        <MobileDockNav
          activeTab={activeTab}
          visibleTabs={visibleTabs}
          onSelect={navigateToTab}
        />
      </div>

      <DashboardCelebrationOverlay
        celebration={activeCelebration}
        shouldReduceMotion={Boolean(shouldReduceMotion)}
        onDismiss={dismissCelebration}
      />

      <CompletionDialog
        completionTarget={completionTarget}
        form={completionForm}
        isSubmitting={completeTaskMutation.isPending}
        onClose={closeCompletionDialog}
        onSubmit={(values) => {
          if (!completionTarget) {
            return
          }

          completeTaskMutation.mutate({
            taskId: completionTarget.id,
            ...toCompleteTaskPayload(values),
          })
        }}
      />
    </main>
  )
}

function handleMutationError(error: unknown) {
  const message = error instanceof ApiError ? error.message : 'Something went wrong'
  toast.error(message)
}
