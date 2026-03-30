import type {
  AdminAccessPayload,
  AdminBootstrap,
  AdminCatalogQuery,
  AdminReward,
  AdminTask,
  ActivityEvent,
  ActivityComment,
  ActivityMediaItem,
  ActivityRun,
  ChangePasswordPayload,
  CompleteTaskPayload,
  CompleteTaskResponse,
  CreateCategoryPayload,
  CreatePlayerPayload,
  CreateRewardPayload,
  CreateTaskPayload,
  CreateActivityCommentPayload,
  LeaderboardEntry,
  LoginPayload,
  NotificationItem,
  PaginatedResponse,
  PlayerReward,
  PlayerTask,
  PublicConfig,
  RefreshedAsset,
  RefreshableAssetRef,
  RewardCatalogQuery,
  ResetPlayerPasswordPayload,
  RewardPurchase,
  QueueTaskRunMediaResponse,
  RefreshAssetPayload,
  SessionData,
  SetupState,
  TaskCatalogQuery,
  UpdateAvatarPayload,
  UpdateCategoryAppearancePayload,
  UpdateOnboardingStatePayload,
  UpdatePlayerBalancesPayload,
  UpdateEmailSettingsPayload,
  UpdateSettingsPayload,
  UploadLoginBackgroundMediaResponse,
} from '@/types/app'

const configuredApiUrl = (import.meta.env.VITE_API_URL ?? '').trim()

const isAbsoluteApiUrl = (value: string) => /^https?:\/\//.test(value)

const apiBaseUrl = (() => {
  if (!configuredApiUrl) {
    return '/api'
  }

  if (isAbsoluteApiUrl(configuredApiUrl)) {
    return configuredApiUrl.endsWith('/api') ? configuredApiUrl : `${configuredApiUrl}/api`
  }

  if (configuredApiUrl.endsWith('/api')) {
    return configuredApiUrl
  }

  const normalizedPath = configuredApiUrl.startsWith('/') ? configuredApiUrl : `/${configuredApiUrl}`
  return `${normalizedPath}/api`
})()

export const realtimeUrl = (() => {
  if (isAbsoluteApiUrl(configuredApiUrl)) {
    const realtimeBaseUrl = configuredApiUrl.endsWith('/api')
      ? configuredApiUrl.slice(0, -4)
      : configuredApiUrl

    return realtimeBaseUrl
      .replace(/^http:/, 'ws:')
      .replace(/^https:/, 'wss:') + '/api/live'
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/api/live`
  }

  return 'ws://localhost:3000/api/live'
})()

export class ApiError extends Error {
  status: number
  requestId: string | null

  constructor(message: string, status: number, requestId: string | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.requestId = requestId
  }
}

function withQuery(path: string, params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return
    }

    search.set(key, String(value))
  })

  const query = search.toString()
  return query ? `${path}?${query}` : path
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData
  let response: Response

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      credentials: 'include',
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(init?.headers || {}),
      },
      ...init,
    })
  } catch {
    throw new ApiError('Network request failed', 0, null)
  }

  if (!response.ok) {
    let message = 'Request failed'
    let requestId = response.headers.get('x-request-id')

    try {
      const payload = await response.json() as { error?: string; requestId?: string }
      message = payload.error || message
      requestId = requestId || payload.requestId || null
    } catch {
      message = response.statusText || message
    }

    throw new ApiError(
      requestId ? `${message} [${requestId}]` : message,
      response.status,
      requestId,
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export const api = {
  getPublicConfig: () => request<PublicConfig>('/public/config'),
  getSession: async () => {
    try {
      return await request<SessionData>('/auth/me')
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return null
      }

      throw error
    }
  },
  login: (payload: LoginPayload) =>
    request<{ success: true }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  adminAccess: (payload: AdminAccessPayload) =>
    request<{ success: true }>('/auth/admin-access', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  logout: () =>
    request<{ success: true }>('/auth/logout', {
      method: 'POST',
    }),
  changePassword: (payload: ChangePasswordPayload) =>
    request<{ success: true }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  completePasswordSetup: (payload: ChangePasswordPayload) =>
    request<{ success: true }>('/auth/complete-password-setup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  verifyEmailToken: (token: string) =>
    request<{ success: true }>('/auth/email/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  updateEmailSettings: (payload: UpdateEmailSettingsPayload) =>
    request<{
      email: string | null
      emailVerifiedAt: string | null
      emailNotificationsEnabled: boolean
      inAppNotificationsEnabled: boolean
      verificationSent: boolean
    }>('/auth/email', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  updateAvatar: (payload: UpdateAvatarPayload) =>
    request<{ avatarUrl: string | null }>('/auth/avatar', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  refreshAsset: (asset: RefreshableAssetRef) =>
    request<RefreshedAsset>('/media/refresh', {
      method: 'POST',
      body: JSON.stringify({ asset } satisfies RefreshAssetPayload),
    }),
  requestEmailVerification: () =>
    request<{ success: true; alreadyVerified?: boolean }>('/auth/email/request-verification', {
      method: 'POST',
    }),
  getAdminBootstrap: () => request<AdminBootstrap>('/admin/bootstrap'),
  getAdminOnboardingBootstrap: () => request<AdminBootstrap>('/admin/onboarding/bootstrap'),
  updateOnboardingState: (payload: UpdateOnboardingStatePayload) =>
    request<SetupState>('/admin/onboarding/state', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  launchOnboarding: () =>
    request<SetupState>('/admin/onboarding/launch', {
      method: 'POST',
    }),
  getAdminTasks: (params?: AdminCatalogQuery) =>
    request<PaginatedResponse<AdminTask>>(withQuery('/admin/tasks', {
      page: params?.page,
      pageSize: params?.pageSize,
      search: params?.search,
    })),
  getAdminRewards: (params?: AdminCatalogQuery) =>
    request<PaginatedResponse<AdminReward>>(withQuery('/admin/rewards', {
      page: params?.page,
      pageSize: params?.pageSize,
      search: params?.search,
    })),
  createPlayer: (payload: CreatePlayerPayload) =>
    request('/admin/players', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deletePlayer: (playerId: number) =>
    request<void>(`/admin/players/${playerId}`, {
      method: 'DELETE',
    }),
  resetPlayerPassword: (playerId: number, payload: ResetPlayerPasswordPayload) =>
    request(`/admin/players/${playerId}/password`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  updatePlayerBalances: (playerId: number, payload: UpdatePlayerBalancesPayload) =>
    request<{ success: true }>(`/admin/players/${playerId}/balances`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  createCategory: (payload: CreateCategoryPayload) =>
    request('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateCategory: (categoryId: number, payload: UpdateCategoryAppearancePayload) =>
    request(`/admin/categories/${categoryId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteCategory: (categoryId: number) =>
    request<void>(`/admin/categories/${categoryId}`, {
      method: 'DELETE',
    }),
  updateSettings: (payload: UpdateSettingsPayload) =>
    request<AdminBootstrap>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  uploadLoginBackgroundMedia: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    return request<UploadLoginBackgroundMediaResponse>('/admin/settings/login-background-media', {
      method: 'POST',
      headers: {},
      body: formData,
    })
  },
  createTask: (payload: CreateTaskPayload) =>
    request('/admin/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateTask: (taskId: number, payload: CreateTaskPayload) =>
    request(`/admin/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteTask: (taskId: number) =>
    request<void>(`/admin/tasks/${taskId}`, {
      method: 'DELETE',
    }),
  createReward: (payload: CreateRewardPayload) =>
    request('/admin/rewards', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateReward: (rewardId: number, payload: CreateRewardPayload) =>
    request(`/admin/rewards/${rewardId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteReward: (rewardId: number) =>
    request<void>(`/admin/rewards/${rewardId}`, {
      method: 'DELETE',
    }),
  getTasks: (params?: TaskCatalogQuery) =>
    request<PaginatedResponse<PlayerTask>>(withQuery('/tasks', {
      page: params?.page,
      pageSize: params?.pageSize,
      search: params?.search,
      categoryIds: params?.categoryIds?.join(','),
      collection: params?.collection,
    })),
  getTaskBySlug: (slug: string) => request<PlayerTask>(`/tasks/${slug}`),
  startTask: (taskId: number) =>
    request(`/tasks/${taskId}/start`, {
      method: 'POST',
    }),
  completeTask: (taskId: number, payload: CompleteTaskPayload) =>
    request<CompleteTaskResponse>(`/tasks/${taskId}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  uploadTaskRunMedia: async (runId: number, files: File[]) => {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))

    return request<QueueTaskRunMediaResponse>(`/tasks/runs/${runId}/media`, {
      method: 'POST',
      headers: {},
      body: formData,
    })
  },
  getRewards: (params?: RewardCatalogQuery) =>
    request<PaginatedResponse<PlayerReward>>(withQuery('/rewards', {
      page: params?.page,
      pageSize: params?.pageSize,
      search: params?.search,
      categoryIds: params?.categoryIds?.join(','),
      collection: params?.collection,
    })),
  getRewardBySlug: (slug: string) => request<PlayerReward>(`/rewards/${slug}`),
  getRewardPurchases: () => request<RewardPurchase[]>('/rewards/purchases'),
  purchaseReward: (rewardId: number) =>
    request(`/rewards/${rewardId}/purchase`, {
      method: 'POST',
    }),
  redeemReward: (purchaseId: number) =>
    request(`/rewards/purchases/${purchaseId}/redeem`, {
      method: 'POST',
    }),
  getNotifications: () => request<NotificationItem[]>('/notifications'),
  markNotificationRead: (notificationId: number) =>
    request(`/notifications/${notificationId}/read`, {
      method: 'POST',
    }),
  markAllNotificationsRead: () =>
    request<NotificationItem[]>('/notifications/read-all', {
      method: 'POST',
    }),
  getLeaderboard: (params?: { page?: number; pageSize?: number }) =>
    request<PaginatedResponse<LeaderboardEntry>>(withQuery('/activity/leaderboard', params || {})),
  getActivityFeed: (params?: { page?: number; pageSize?: number }) =>
    request<PaginatedResponse<ActivityEvent>>(withQuery('/activity/feed', params || {})),
  getActivityRun: (runId: number) => request<ActivityRun>(`/activity/runs/${runId}`),
  getActivityRuns: (params?: { page?: number; pageSize?: number; search?: string; playerId?: number | null }) =>
    request<PaginatedResponse<ActivityRun>>(withQuery('/activity/runs', params || {})),
  getActivityRunMedia: (runId: number) => request<ActivityMediaItem[]>(`/activity/runs/${runId}/media`),
  getTaskRunMediaDownloadUrl: (mediaId: number) => `${apiBaseUrl}/media/task-runs/${mediaId}/download`,
  getActivityRunComments: (runId: number, params?: { page?: number; pageSize?: number }) =>
    request<PaginatedResponse<ActivityComment>>(withQuery(`/activity/runs/${runId}/comments`, params || {})),
  addActivityComment: (runId: number, body: CreateActivityCommentPayload['body']) =>
    request(`/activity/runs/${runId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
}
