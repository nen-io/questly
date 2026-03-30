# Questly API Reference

This document describes the HTTP API implemented in [`api/src`](../api/src). It is written from the route handlers, shared contracts, validation schemas, and supporting business logic in the current codebase.

## Scope

- Base health endpoint: `/health`
- API base path: `/api`
- Main route groups:
  - `/api/public`
  - `/api/auth`
  - `/api/admin`
  - `/api/tasks`
  - `/api/rewards`
  - `/api/activity`
  - `/api/notifications`
  - `/api/media`

## Core conventions

### Authentication

- Authenticated routes use an `httpOnly` cookie, not a bearer token.
- Default cookie name: `questly_auth`
- Cookie lifetime: 7 days
- Cookie flags:
  - `httpOnly: true`
  - `sameSite: lax`
  - `secure: true` only when `NODE_ENV=production` or `COOKIE_SECURE=true`
- Missing cookie returns `401 { error: "Unauthorized" }`
- Invalid or broken JWT returns `401 { error: "Invalid session" }`
- Expired or superseded session returns `401 { error: "Session expired" }`

### Roles

- `admin` routes are protected by both auth and `requireRole('admin')`
- Many player-facing routes do not use `requireRole('player')`, but they do return player-specific `403` messages inside the handler
- Some list routes intentionally return empty results for admins instead of `403`

### Content types

- Most routes use `application/json`
- Multipart routes:
  - `POST /api/tasks/:id/complete`
  - `POST /api/tasks/runs/:id/media`
  - `POST /api/admin/settings/login-background-media`

### Dates

- Database timestamps are serialized as ISO strings in JSON responses
- All examples below describe date fields as `string`

### Error shape

Most handled route failures return:

```ts
{
  error: string
  requestId?: string
}
```

Nuances:

- Route handlers that use `handleRouteError(...)` include `requestId`
- Some early returns send only `{ error }`
- Validation failures usually surface as `400`
- Unexpected internal failures are masked behind a fallback message

### Pagination

Paginated routes return:

```ts
interface PaginatedResponse<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasMore: boolean
}
```

Nuances:

- `page` and `pageSize` accept strings or numbers
- Both must be positive integers
- `pageSize` is clamped to a route-specific maximum, usually `50`
- `totalPages` is `0` when `total` is `0`

### Validation and sanitization

- Request bodies and validated query objects are strict. Unknown keys are rejected.
- Text input is sanitized with `sanitize-html`, all tags are stripped, control characters are removed, and whitespace is normalized.
- Empty strings are often coerced to `null` or omitted depending on the field.
- Search text is capped at 120 characters.
- `categoryIds` filters are a single comma-separated string such as `1,2,3`, not repeated query params.

### Media URLs

- Signed media URLs can expire
- The API exposes `POST /api/media/refresh` to re-sign known assets
- Download URLs for win media are delivered as redirects, not JSON payloads

### Internal terminology

- User-facing copy now says `kudos` and `kudos track`
- The API and DB still use internal names like `pointCategories`, `rewardCosts`, and `taskPointRules`
- In this document, “kudos track” refers to the category/points system visible to users

### Single-realm bias

The current implementation behaves like a single-realm product in a few places:

- `GET /api/public/config` reads the first realm row
- `POST /api/auth/admin-access` reads the first active admin row

That is fine for the seeded app flow, but it matters if the project ever expands into true multi-tenant routing.

## Shared DTO cheat sheet

These shared contracts live in [`shared/contracts`](../shared/contracts).

- `PublicConfig`: public realm config, theme, setup state, and branded content
- `SessionData`: authenticated session payload used to bootstrap the UI
- `AdminBootstrap`: admin snapshot with settings, setup state, players, categories, catalog counts, and themes
- `PlayerTask`: decorated quest available to a player
- `PlayerReward`: decorated reward available to a player
- `RewardPurchase`: stored reward purchase history entry
- `ActivityRun`: completed quest run (“win”) with media preview and point snapshot
- `ActivityComment`: decorated win comment
- `ActivityEvent`: feed item from the platform event log
- `NotificationItem`: raw notification row for a user
- `RefreshedAsset`: `{ asset, url }` result from the media refresh endpoint

## Upload limits

### Quest / win media

- Field name: `files`
- Max files per request: `10`
- Max file size: `100 MB` each
- Allowed MIME types:
  - `image/jpeg`
  - `image/png`
  - `image/webp`
  - `image/heic`
  - `image/heif`
  - `video/mp4`
  - `video/webm`
  - `video/quicktime`

### Login background media

- Field name: `file`
- Max files per request: `1`
- Max file size: `80 MB`
- Same allowed image/video MIME family as quest media

## Health

### `GET /health`

- Auth: none
- Query: none
- Body: none
- Response:

```ts
{
  status: 'ok'
  message: 'Questly API is running'
}
```

## Public routes

### `GET /api/public/config`

- Auth: none
- Response: `PublicConfig`
- What it does:
  - returns the first seeded realm
  - includes presentation content, resolved theme tokens, and onboarding/setup state
- Nuances:
  - returns `503` with `Platform is not seeded yet` when no realm exists
  - `onboardingCompleted` mirrors `setup.isLaunched`
  - login background media comes back as signed URLs plus refreshable asset refs when stored in object storage

### `GET /api/public/themes`

- Auth: none
- Response: `ThemeConfig[]`
- What it does:
  - returns all theme presets ordered by name

## Auth routes

### `POST /api/auth/login`

- Auth: none
- Body:

```ts
{
  username: string
  password: string
}
```

- Response:

```ts
{ success: true }
```

- What it does:
  - authenticates an active user by username and password
  - starts a server-side session
  - sets the auth cookie
- Nuances:
  - player login is blocked until onboarding is launched
  - returns `401` for invalid credentials
  - returns `403` for players when the realm has not launched yet
  - response does not include session data; the client is expected to call `GET /api/auth/me`

### `POST /api/auth/admin-access`

- Auth: none
- Body:

```ts
{
  password: string
}
```

- Response:

```ts
{ success: true }
```

- What it does:
  - allows the admin to enter the setup flow before the realm is launched
  - starts a session and sets the auth cookie
- Nuances:
  - only available while setup is still in progress
  - returns `404` if no active admin account exists
  - returns `409` once the realm has already launched
  - selects the first active admin row, not an admin keyed by realm slug or username

### `POST /api/auth/logout`

- Auth: none
- Body: none
- Response:

```ts
{ success: true }
```

- What it does:
  - ends the current server-side session when the cookie is valid
  - always clears the browser cookie
- Nuances:
  - invalid cookies are ignored instead of causing an error

### `GET /api/auth/me`

- Auth: required
- Response: `SessionData`
- What it does:
  - returns the current user, profile, platform presentation, player roster, balances, task stats, and unread notification count
- Nuances:
  - player balances are auto-created on first access if missing
  - admin users receive an empty `balances` array
  - `platform.players` contains active users in the realm with online presence
  - `platform.onboarding.needsSetup` is only `true` for admins before launch

### `GET /api/auth/sessions`

- Auth: required
- Response:

```ts
{
  currentSessionId: string
  sessions: Array<{
    sessionId: string
    status: string
    lastSeenAt: string
    expiresAt: string
    endedAt: string | null
    createdAt: string
  }>
}
```

- What it does:
  - lists all sessions for the current user
- Nuances:
  - this is not just active sessions; ended and expired sessions are included too

### `POST /api/auth/change-password`

- Auth: required
- Body:

```ts
{
  currentPassword?: string | null
  newPassword: string
  email?: string | null
  avatarDataUrl?: string | null
}
```

- Response:

```ts
{ success: true }
```

- What it does:
  - changes the password for a normal logged-in session
  - can also update email and avatar in the same request
- Nuances:
  - `currentPassword` is required unless `mustChangePassword` is already true
  - new password cannot match the old password
  - all sessions are ended after the update
  - the auth cookie is cleared, so the user must log in again
  - if email changes, verification is reset and the API attempts to send a new verification email
  - profile changes still succeed even if sending the verification email fails

### `POST /api/auth/complete-password-setup`

- Auth: required
- Body:

```ts
{
  currentPassword?: string | null
  newPassword: string
  email?: string | null
  avatarDataUrl?: string | null
}
```

- Response:

```ts
{ success: true }
```

- What it does:
  - completes first-login or temporary-password setup
  - ends old sessions and creates a fresh authenticated session immediately
- Nuances:
  - only allowed when `mustChangePassword` is true
  - returns `400` if password setup is already complete
  - `currentPassword` is accepted by schema but not required by the flow
  - unlike `change-password`, this route sets a fresh auth cookie instead of logging the user out
  - email verification send failures are logged but do not fail the request

### `PUT /api/auth/email`

- Auth: required
- Body:

```ts
{
  email: string | null
  emailNotificationsEnabled: boolean
  inAppNotificationsEnabled: boolean
}
```

- Response:

```ts
{
  email: string | null
  emailVerifiedAt: string | null
  emailNotificationsEnabled: boolean
  inAppNotificationsEnabled: boolean
  verificationSent: boolean
}
```

- What it does:
  - updates email and notification preferences
- Nuances:
  - changing email clears `emailVerifiedAt`
  - the route attempts to send a new verification email when email changes
  - if email sending fails, the request still succeeds and `verificationSent` is still based on “email changed”, not on actual SMTP success

### `PUT /api/auth/avatar`

- Auth: required
- Body:

```ts
{
  avatarDataUrl: string | null
}
```

- Response:

```ts
{
  avatarUrl: string | null
}
```

- What it does:
  - uploads an avatar from a supported image data URL
  - or deletes the existing avatar when `avatarDataUrl` is `null`
- Nuances:
  - max avatar data URL size is `8_000_000` characters

### `POST /api/auth/email/request-verification`

- Auth: required
- Body: none
- Response:

```ts
{ success: true; alreadyVerified?: true }
```

- What it does:
  - sends a verification email for the current stored email
- Nuances:
  - returns `400` if the account has no email set
  - returns `{ success: true, alreadyVerified: true }` if the email is already verified

### `POST /api/auth/email/verify`

- Auth: none
- Body:

```ts
{
  token: string
}
```

- Response:

```ts
{ success: true }
```

- What it does:
  - consumes the email verification token and marks the email as verified

## Admin routes

All admin routes require both:

- authentication
- `admin` role

### `GET /api/admin/bootstrap`

- Response: `AdminBootstrap`
- What it does:
  - returns the main admin snapshot used to bootstrap the admin UI
- Nuances:
  - ensures player balances exist before building the response

### `GET /api/admin/onboarding/bootstrap`

- Response: `AdminBootstrap`
- What it does:
  - same payload as `/api/admin/bootstrap`
- Nuances:
  - this is effectively an alias for onboarding-specific UI flows

### `GET /api/admin/tasks`

- Query:

```ts
{
  page?: number
  pageSize?: number
  search?: string
}
```

- Response: `PaginatedResponse<AdminTask>`
- What it does:
  - returns decorated admin quest records with `userIds`, `rewardRules`, and `penaltyRules`
- Nuances:
  - default `pageSize` is `12`
  - max `pageSize` is `50`
  - search matches title and description only

### `GET /api/admin/rewards`

- Query:

```ts
{
  page?: number
  pageSize?: number
  search?: string
}
```

- Response: `PaginatedResponse<AdminReward>`
- What it does:
  - returns decorated admin reward records with `userIds` and `costs`
- Nuances:
  - default `pageSize` is `12`
  - max `pageSize` is `50`
  - search matches title and description only

### `GET /api/admin/themes`

- Response: `ThemeConfig[]`
- What it does:
  - returns all theme presets ordered by name

### `GET /api/admin/players`

- Response:

```ts
Array<{
  id: number
  username: string
  displayName: string
  role: 'admin' | 'player'
  status: string
  mustChangePassword: boolean
  avatarUrl: string | null
  avatarAsset: { kind: 'avatar'; userId: number } | null
  online: boolean
}>
```

- What it does:
  - returns active users in the realm with presence info
- Nuances:
  - despite the route name, this includes the active admin account too
  - unlike `AdminBootstrap.players`, this route does not include balances

### `GET /api/admin/categories`

- Response: `AdminCategory[]`
- What it does:
  - returns all kudos tracks in the realm
- Nuances:
  - ordered by `sortOrder`, then `name`

### `GET /api/admin/settings`

- Response:

```ts
AdminBootstrap['settings']
```

- What it does:
  - returns only the `settings` slice from the admin bootstrap

### `PUT /api/admin/onboarding/state`

- Body:

```ts
{
  currentStep?: 'identity' | 'player' | 'attribute' | 'quest' | 'reward' | 'launch' | 'landing'
  completedSteps?: Array<'identity' | 'player' | 'attribute' | 'quest' | 'reward' | 'launch' | 'landing'>
  lastVisitedStep?: 'identity' | 'player' | 'attribute' | 'quest' | 'reward' | 'launch' | 'landing'
}
```

- Response: `SetupState`
- What it does:
  - saves onboarding progress
- Nuances:
  - `landing` and invalid-ish values are normalized back to the first real step
  - completed steps are normalized and deduplicated

### `POST /api/admin/onboarding/launch`

- Body: none
- Response: `SetupState`
- What it does:
  - launches the platform if required prerequisites are satisfied
- Nuances:
  - returns `400` with launch blockers when setup is incomplete:

```ts
{
  error: string
  blockers: string[]
}
```

  - current launch blockers are:
    - identity step must be saved
    - at least one active player must exist
    - at least one active kudos track must exist

### `POST /api/admin/players`

- Body:

```ts
{
  username: string
  displayName: string
  temporaryPassword: string
}
```

- Response:

```ts
{
  id: number
  username: string
  displayName: string
  role: string
  status: string
  mustChangePassword: boolean
}
```

- What it does:
  - creates a player with a temporary password and `mustChangePassword=true`
  - ensures zero balances exist for all active kudos tracks
- Nuances:
  - username uniqueness is global, not realm-scoped

### `DELETE /api/admin/players/:id`

- Params:

```ts
{ id: number }
```

- Response: `204 No Content`
- What it does:
  - retires a player
  - removes assignments, balances, email verification tokens, and active sessions
- Nuances:
  - this is a soft delete for the user row: `status` becomes `deleted`
  - historical wins, comments, and reward purchases remain intact
  - before launch, onboarding progress can move backward if the player roster becomes empty

### `PATCH /api/admin/players/:id/password`

- Params:

```ts
{ id: number }
```

- Body:

```ts
{
  temporaryPassword: string
}
```

- Response:

```ts
{
  id: number
  username: string
  mustChangePassword: boolean
}
```

- What it does:
  - sets a new temporary password
  - forces password setup at next login
  - bumps `tokenVersion` and ends existing sessions
- Nuances:
  - the route name says “player”, but the update query only scopes by `id` and `realmId`, not by `role`
  - in practice the UI targets players, but the handler itself does not re-check that invariant

### `PUT /api/admin/players/:id/balances`

- Params:

```ts
{ id: number }
```

- Body:

```ts
{
  balances: Array<{
    categoryId: number
    balance: number
  }>
}
```

- Response:

```ts
{ success: true }
```

- What it does:
  - upserts the provided balances for a player
- Nuances:
  - omitted categories are left untouched
  - allowed balance range is `0..1_000_000`
  - only active players can be targeted

### `POST /api/admin/categories`

- Body:

```ts
{
  name: string
  description?: string
  color?: string
  icon?: string
  sortOrder?: number
  isActive?: boolean
}
```

- Response: raw created category row
- What it does:
  - creates a new kudos track
  - auto-creates zero balances for all active players
- Nuances:
  - slug is derived from `name`
  - slug uniqueness is enforced within the realm

### `PATCH /api/admin/categories/:id`

- Params:

```ts
{ id: number }
```

- Body:

```ts
{
  name: string
  color?: string
  icon?: string
}
```

- Response: raw updated category row
- What it does:
  - updates kudos track appearance
- Nuances:
  - cosmetic only
  - category id and relationships stay unchanged across balances, quests, rewards, and stored snapshots

### `DELETE /api/admin/categories/:id`

- Params:

```ts
{ id: number }
```

- Response: `204 No Content`
- What it does:
  - deletes a kudos track and its balance rows
- Nuances:
  - returns `409` if the track is used by any quest
  - returns `409` if the track is used by any reward
  - returns `409` if any player still has a non-zero balance
  - delete is only allowed when the track is fully detached and zeroed out

### `POST /api/admin/settings/login-background-media`

- Content-Type: `multipart/form-data`
- File field: `file`
- Response:

```ts
{
  mediaType: 'image' | 'video'
  source: string
  url: string
  asset: {
    kind: 'content_media'
    slot: 'login_background_image' | 'login_background_video'
  }
}
```

- What it does:
  - uploads a branded login background asset
- Nuances:
  - returns `400` if no file is sent
  - persist `source` into settings, not `url`
  - `url` is a signed access URL and may expire
  - image uploads are converted to bounded `webp`
  - video uploads are stored in original video form

### `PUT /api/admin/settings`

- Body:

```ts
{
  platformName: string
  themePresetKey: string
  onboardingCompleted: boolean
  content: {
    fontPresetKey: string
    loginTitle: string
    loginMessage: string
    loginImageUrl: string | null
    loginBackgroundImageUrl: string | null
    loginBackgroundImageSource: string | null
    loginBackgroundVideoUrl: string | null
    loginBackgroundVideoSource: string | null
    dashboardTitle: string
    dashboardMessage: string
    onboardingIntroEyebrow: string
    onboardingIntroTitle: string
    onboardingIntroMessage: string
    onboardingLaunchTitle: string
    onboardingLaunchMessage: string
  }
}
```

- Response: `AdminBootstrap`
- What it does:
  - updates realm branding, theme, and content blocks
- Nuances:
  - `themePresetKey` must exist
  - the route stores the background `source` values, not the signed `url` values
  - `loginBackgroundImageUrl` and `loginBackgroundVideoUrl` are validated in the payload, but the persisted object-storage references come from `loginBackgroundImageSource` and `loginBackgroundVideoSource`
  - previously replaced background media is deleted after the new content rows are saved
  - the launch state visible to clients is driven by onboarding state, not just the raw `onboardingCompleted` flag in settings

### `POST /api/admin/tasks`

- Body: `CreateTaskPayload`

```ts
{
  title: string
  slug?: string
  description?: string
  color?: string
  icon?: string
  recurrence: 'daily' | 'weekly' | 'monthly' | 'one_time'
  assignmentMode: 'all_players' | 'selected_players'
  userIds: number[]
  rewardRules: Array<{ categoryId: number; amount: number }>
  penaltyRules: Array<{ categoryId: number; amount: number }>
  expiresInHours: number | null
  isActive?: boolean
}
```

- Response: raw created task row
- What it does:
  - creates a quest, assignment rows, rule rows, notifications, and an activity event
- Nuances:
  - selected-player quests require at least one `userId`
  - at least one reward or penalty rule is required
  - `expiresInHours` range is `1..8760` when present
  - create response is the raw `tasks` table row, not decorated `AdminTask`

### `PATCH /api/admin/tasks/:id`

- Params:

```ts
{ id: number }
```

- Body: same as `POST /api/admin/tasks`
- Response: raw updated task row
- What it does:
  - replaces task metadata, assignments, and point rules
- Nuances:
  - returns `404` when the task does not belong to the admin’s realm
  - response is raw table data, not a decorated `AdminTask`

### `DELETE /api/admin/tasks/:id`

- Params:

```ts
{ id: number }
```

- Response: `204 No Content`
- What it does:
  - deletes a quest and its relation rows
- Nuances:
  - returns `409` if any task run already exists for that quest
  - once a quest has history, the supported path is to hide it instead of deleting it

### `POST /api/admin/rewards`

- Body: `CreateRewardPayload`

```ts
{
  title: string
  slug?: string
  description?: string
  color?: string
  icon?: string
  assignmentMode: 'all_players' | 'selected_players'
  userIds: number[]
  costs: Array<{ categoryId: number; amount: number }>
  cooldownDays: number
  isRedeemable?: boolean
  isActive?: boolean
}
```

- Response: raw created reward row
- What it does:
  - creates a reward, assignments, cost rows, notifications, and an activity event
- Nuances:
  - selected-player rewards require at least one `userId`
  - at least one cost is required
  - `cooldownDays` range is `0..3650`
  - response is the raw `rewards` row, not decorated `AdminReward`

### `PATCH /api/admin/rewards/:id`

- Params:

```ts
{ id: number }
```

- Body: same as `POST /api/admin/rewards`
- Response: raw updated reward row
- What it does:
  - replaces reward metadata, assignments, and cost rows
- Nuances:
  - returns `404` when the reward does not belong to the admin’s realm
  - response is raw table data, not a decorated `AdminReward`

### `DELETE /api/admin/rewards/:id`

- Params:

```ts
{ id: number }
```

- Response: `204 No Content`
- What it does:
  - deletes a reward and its relation rows
- Nuances:
  - returns `409` if any purchase history exists
  - once a reward has history, the supported path is to hide it instead of deleting it

## Task routes

All task routes require authentication.

### `GET /api/tasks`

- Query:

```ts
{
  page?: number
  pageSize?: number
  search?: string
  categoryIds?: string // comma-separated ids, example: "1,2,3"
  collection?: 'active' | 'available'
}
```

- Response: `PaginatedResponse<PlayerTask>`
- What it does:
  - returns player-visible quests with status, active run info, reward rules, and penalty rules
- Nuances:
  - admins get an empty paginated result instead of `403`
  - default `pageSize` is `12`
  - max `pageSize` is `50`
  - `collection=active` means only active runs
  - `collection=available` means “not active”, so cooldown quests are included
  - listing tasks triggers overdue-run sweeping for the current player before results are built
  - overdue penalties deduct from balances but never drive a balance below `0`
  - cooldown length comes from recurrence:
    - `daily`: 1 day
    - `weekly`: 7 days
    - `monthly`: 30 days
    - `one_time`: 365 days
  - a `selected_players` quest with no assignment rows is effectively visible to everyone because the access check treats empty assignee lists as open access
  - sorting prefers selected category matches, then fuzzy search score, then availability status

### `GET /api/tasks/:slug`

- Params:

```ts
{ slug: string }
```

- Response: `PlayerTask`
- What it does:
  - returns a single player-visible quest by slug
- Nuances:
  - admins get `403`
  - access is based on visibility to the current player, not just slug existence

### `POST /api/tasks/:id/start`

- Params:

```ts
{ id: number }
```

- Response: raw `task_runs` row

```ts
{
  id: number
  taskId: number
  userId: number
  status: string
  startedAt: string
  dueAt: string | null
  resolvedAt: string | null
  notes: string | null
  pointSnapshot: unknown
}
```

- What it does:
  - starts a quest run for the player
- Nuances:
  - admins get `403`
  - returns `404` if the quest is not visible to the player
  - returns `400` when the quest is in cooldown
  - if an active run already exists, that existing row is returned instead of creating a duplicate
  - due date is calculated from `expiresInHours`

### `POST /api/tasks/:id/complete`

- Content-Type: `multipart/form-data`
- Params:

```ts
{ id: number }
```

- Body fields:

```ts
{
  notes?: string | null
  files?: File[] // multipart field name: files
}
```

- Response: `CompleteTaskResponse`

```ts
{
  success: true
  runId: number
  mediaProcessing: {
    status: 'none' | 'queued' | 'failed'
    queuedCount: number
    failedCount: number
  }
}
```

- What it does:
  - completes the active quest run
  - awards reward rules to player balances
  - optionally uploads and queues attached media for background processing
  - emits activity + notification side effects
- Nuances:
  - admins get `403`
  - if the quest already auto-expired, the route returns `400`
  - media queue failure does not roll back quest completion
  - `mediaProcessing.status='failed'` means the run still completed, but none of the uploaded files were successfully queued
  - upload queueing persists each original asset separately, triggers the worker immediately, and retries processing on the server with backoff

### `POST /api/tasks/runs/:id/media`

- Content-Type: `multipart/form-data`
- Params:

```ts
{ id: number }
```

- Body fields:

```ts
{
  files: File[] // multipart field name: files
}
```

- Response: `QueueTaskRunMediaResponse`

```ts
{
  success: true
  queuedCount: number
  failedCount: number
}
```

- What it does:
  - uploads more media for an already completed run
- Nuances:
  - admins get `403`
  - only completed runs owned by the current player can be targeted
  - worker processing is kicked immediately after queue insertion

## Reward routes

All reward routes require authentication.

### `GET /api/rewards`

- Query:

```ts
{
  page?: number
  pageSize?: number
  search?: string
  categoryIds?: string // comma-separated ids
  collection?: 'owned' | 'available'
}
```

- Response: `PaginatedResponse<PlayerReward>`
- What it does:
  - returns player-visible rewards with costs, status, cooldown, and latest purchase
- Nuances:
  - admins get an empty paginated result instead of `403`
  - default `pageSize` is `12`
  - max `pageSize` is `50`
  - `collection=owned` means the latest purchase is still in `purchased` state
  - `collection=available` means “not currently owned”, not “immediately purchasable”; cooldown rewards can still appear there
  - a `selected_players` reward with no assignment rows is effectively visible to everyone because the access check treats empty assignee lists as open access

### `GET /api/rewards/:slug`

- Params:

```ts
{ slug: string }
```

- Response: `PlayerReward`
- What it does:
  - returns a single player-visible reward by slug
- Nuances:
  - admins get `403`

### `GET /api/rewards/purchases`

- Response: `RewardPurchase[]`
- What it does:
  - returns purchase history for the current player, newest first
- Nuances:
  - admins get `[]`
  - `pointSnapshot` is re-decorated with the current kudos track presentation so names/colors/icons stay current

### `POST /api/rewards/:id/purchase`

- Params:

```ts
{ id: number }
```

- Body: none
- Response:

```ts
{ success: true }
```

- What it does:
  - purchases a reward and deducts its costs from player balances
- Nuances:
  - admins get `403`
  - selected-player rewards require the current player to be assigned
  - returns `400` on cooldown
  - returns `400` with messages like `Not enough Love` when any balance is insufficient
  - all balances are validated before any deduction happens, so the deduction is effectively atomic inside the transaction
  - purchase history stores a `pointSnapshot` of the costs at purchase time

### `POST /api/rewards/purchases/:id/redeem`

- Params:

```ts
{ id: number }
```

- Body: none
- Response:

```ts
{
  id: number
  status: string
  redeemedAt: string | null
}
```

- What it does:
  - marks a purchase as redeemed
- Nuances:
  - admins get `403`
  - the handler updates by purchase id plus current user id
  - it does not separately check for an already redeemed purchase before writing again

## Activity routes

All activity routes require authentication.

### `GET /api/activity/feed`

- Query:

```ts
{
  page?: number
  pageSize?: number
}
```

- Response: `PaginatedResponse<ActivityEvent>`
- What it does:
  - returns platform events newest first
- Nuances:
  - default `pageSize` is `12`
  - max `pageSize` is `50`
  - comment events include `metadata.commentBody` when a comment id exists

### `GET /api/activity/leaderboard`

- Query:

```ts
{
  page?: number
  pageSize?: number
}
```

- Response: `PaginatedResponse<LeaderboardEntry>`
- What it does:
  - returns the leaderboard across active players in the realm
- Nuances:
  - default `pageSize` is `10`
  - max `pageSize` is `50`
  - sorting is:
    - total points descending
    - completed wins descending
    - display name ascending

### `GET /api/activity/runs`

- Query:

```ts
{
  page?: number
  pageSize?: number
  playerId?: number
  search?: string
}
```

- Response: `PaginatedResponse<ActivityRun>`
- What it does:
  - returns completed quest runs (“wins”)
- Nuances:
  - only completed runs are included
  - default `pageSize` is `10`
  - max `pageSize` is `50`
  - `search` matches quest title, player display name, and notes
  - `playerId` must belong to an active user in the same realm or the route returns `404`
  - list entries sign only the first 3 preview media items for speed
  - each item includes `pendingMediaCount`, which comes from queued background media jobs that have not finished processing yet

### `GET /api/activity/runs/:id`

- Params:

```ts
{ id: number }
```

- Response: `ActivityRun`
- What it does:
  - returns one completed run in full decorated form
- Nuances:
  - returns `404` with `Completed win not found` if the run is missing, not in the realm, or not completed

### `GET /api/activity/runs/:id/media`

- Params:

```ts
{ id: number }
```

- Response: `ActivityMediaItem[]`
- What it does:
  - returns signed full and thumbnail media entries for a run
- Nuances:
  - internally the route checks that the run belongs to the realm, but it does not re-check completed status in the loader itself
  - in normal product flow this is still used for completed wins only

### `GET /api/activity/runs/:id/comments`

- Params:

```ts
{ id: number }
```

- Query:

```ts
{
  page?: number
  pageSize?: number
}
```

- Response: `PaginatedResponse<ActivityComment>`
- What it does:
  - returns decorated comments for a run, newest first
- Nuances:
  - default `pageSize` is `20`
  - max `pageSize` is `50`
  - author avatars are signed during response building
  - the run loader scopes by realm, not by completed status

### `POST /api/activity/runs/:id/comments`

- Params:

```ts
{ id: number }
```

- Body:

```ts
{
  body: string
}
```

- Response: raw inserted comment row

```ts
{
  id: number
  taskRunId: number
  userId: number
  body: string
  createdAt: string
}
```

- What it does:
  - adds a comment to a run
  - emits an activity event
  - sends a notification to the run owner when the commenter is someone else
- Nuances:
  - unlike `GET comments`, the create response is not decorated with author name or avatar
  - the route can target any run in the same realm that passes the shared loader, even though the UI uses it for wins

## Notification routes

All notification routes require authentication.

### `GET /api/notifications`

- Response: `NotificationItem[]`
- What it does:
  - returns notifications for the current user, newest first
- Nuances:
  - response is a raw DB-style notification shape

### `POST /api/notifications/:id/read`

- Params:

```ts
{ id: number }
```

- Response: `NotificationItem`
- What it does:
  - marks one notification as read
- Nuances:
  - returns `404` if the notification does not belong to the current user

### `POST /api/notifications/read-all`

- Response: `NotificationItem[]`
- What it does:
  - marks all notifications for the current user as read
  - returns the refreshed notification list

## Media routes

All media routes require authentication.

### `POST /api/media/refresh`

- Body:

```ts
{
  asset:
    | { kind: 'avatar'; userId: number }
    | { kind: 'content_media'; slot: 'login_background_image' | 'login_background_video' }
    | { kind: 'task_run_media'; mediaId: number; variant: 'full' | 'thumbnail' }
}
```

- Response: `RefreshedAsset`

```ts
{
  asset: RefreshableAssetRef
  url: string | null
}
```

- What it does:
  - re-signs a known asset so the client can recover from expired signed URLs
- Nuances:
  - it only works for assets already scoped to the caller’s realm
  - it is not a general bucket signing endpoint
  - `url` can be `null` for assets whose backing storage reference is currently unset

### `GET /api/media/task-runs/:id/download`

- Params:

```ts
{ id: number }
```

- Response:
  - `302` redirect to a signed object-storage URL
- What it does:
  - provides a download-friendly URL for a win media item
- Nuances:
  - the download filename falls back to `win-media-<id>.<ext>` when the original name is missing
  - access is limited to media that belongs to the caller’s realm

## Validation reference

These constraints are easy to miss because they are centralized in [`api/src/lib/schemas.ts`](../api/src/lib/schemas.ts).

### Text limits

- usernames: `3..32`, lowercase letters, numbers, hyphens, underscores
- passwords: `8..128`
- display names: max `60`
- category names: max `60`
- task and reward titles: max `120`
- task and reward descriptions: max `500`
- comment body: max `1000`
- completion notes: max `1000`
- search query: max `120`

### Colors and icons

- colors must be valid hex values
- icon fields are optional single-line strings capped at `16` chars

### Task and reward rules

- each rule amount must be an integer `1..1_000_000`
- max rules per array: `50`
- selected-player quests/rewards require at least one player id
- quests require at least one reward rule or penalty rule
- rewards require at least one cost

### Media/data URL limits

- avatar data URL: max `8_000_000` chars
- login image URL/data URL: max `12_000_000` chars
- login background image URL/data URL: max `12_000_000` chars
- login background video URL/data URL: max `32_000_000` chars

## Background processing nuances

These behaviors affect how clients should reason about task completion and media display.

- Completing a quest is separate from processing its attached media.
- On `POST /api/tasks/:id/complete`, the quest completion transaction finishes first.
- Uploaded media is then queued for background processing.
- Each uploaded original object is persisted and queued independently, so the worker can start before the whole batch finishes.
- The media worker is started at API boot and can also be kicked immediately after queueing.
- Failed processing is retried with exponential backoff.
- If a queue insert fails, the just-uploaded original object is deleted immediately.
- If thumbnail generation/upload fails during processing, any orphaned thumbnail is deleted before retry.
- If retries are exhausted, the original object is deleted and the job is marked `abandoned`.
- Successful jobs are removed from the queue table after insertion into `task_run_media`.

## Practical client notes

- Call `GET /api/auth/me` after login or password-setup completion to get the full session bootstrap.
- When saving branding media, persist `source`, not the signed `url`.
- When a signed URL expires, call `POST /api/media/refresh` with the asset ref already returned by the API.
- After admin create/update routes for quests and rewards, expect to refetch bootstrap/catalog data if the UI needs assignment arrays or decorated rule metadata, because those routes return raw table rows.
