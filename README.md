# Questly Platform

Questly is a gamified life platform for couples, families, and friend groups. Players complete quests, earn kudos, buy rewards, and compete on a shared leaderboard. Admins can theme the experience, manage players, define the kudos system, and launch the realm through a guided onboarding flow.

## Product overview

Questly is built around two roles:

- `admin`: configures the realm, manages players, defines kudos tracks, creates quests and rewards, and launches the experience.
- `player`: logs in, completes quests, earns kudos, spends kudos on rewards, views wins, comments on activity, and tracks progress against others.

### Core gameplay loop

1. An admin creates the realm identity, players, kudos tracks, quests, and rewards.
2. Players log in and start or complete quests.
3. Quest completion updates kudos balances, can attach media, and can create leaderboard-visible wins.
4. Players spend kudos on rewards and later redeem them.
5. Activity, notifications, wins, and the leaderboard keep the realm feeling live.

### Main features

- Guided admin onboarding and launch flow.
- Realm theming and branded sign-in surface.
- Player management and password resets.
- Kudos track management with color and icon identity.
- Quest and reward catalogs with assignment and rule configuration.
- Realtime activity, notifications, and dashboard refreshes.
- Celebration overlays for quest completion, reward purchase, and reward redemption.
- Media-backed wins with refreshable assets and background processing.
- Shared TypeScript contracts between UI and API.

## Workspace overview

This repository is split into three main work areas:

```text
questly-platform/
├── api/                    # Express API, database access, background processing
│   ├── drizzle/            # SQL migrations and drizzle metadata
│   ├── scripts/            # DB script runner helpers
│   └── src/
│       ├── auth/           # JWT and auth helpers
│       ├── db/             # DB client, schema, migrations, seeds
│       ├── lib/            # Business logic, media, email, realtime, tasks
│       ├── routes/         # Route folders with one file per handler
│       └── types/          # API-specific types
├── shared/                 # Shared contracts and validation helpers
│   ├── contracts/          # API/UI contract types
│   ├── font-presets/       # Shared theme font presets
│   └── utils/              # Shared validation helpers
├── web/                    # React + Vite frontend
│   ├── public/             # Static public assets
│   └── src/
│       ├── api/            # Browser API client
│       ├── components/     # Shared UI building blocks
│       ├── hooks/          # App-level hooks, including realtime
│       ├── pages/          # Route-level page folders
│       ├── routes/         # Route helpers and path mapping
│       ├── schemas/        # Form schemas
│       └── types/          # Frontend-facing shared type exports
├── docker-compose.yml      # Local development stack
└── docker-compose.ngrok.yml
```

## UI overview

The frontend lives in [`web/`](./web) and is a React 19 + Vite application.

### Route surfaces

- `/` and `/login`
  - Public entrypoint.
  - Shows either the branded login screen or the admin access landing page before launch.
- `/setup/password`
  - Mandatory password setup for first-time or temporary-password sessions.
- `/setup/onboarding/:step`
  - Admin-only setup flow used before the realm is launched.
- `/app/*`
  - Main authenticated app shell.

### Main page areas

- `web/src/pages/login`
  - Sign-in experience and hero panel.
- `web/src/pages/onboarding`
  - Guided admin setup for identity, players, kudos, quests, rewards, and launch.
- `web/src/pages/dashboard`
  - Main authenticated shell with tabs for overview, quests, rewards, wins, activity, notifications, settings, and admin access.
- `web/src/pages/admin-studio`
  - Admin management interface for players, kudos tracks, branding, quests, and rewards.

### Frontend architecture notes

- Route-level features are grouped under page folders instead of being flattened into global components.
- Shared UI primitives live under `web/src/components`.
- Shared contracts are imported from `shared/` to keep the UI strongly typed against API payloads.
- The frontend talks to the API through `web/src/api/client.ts`.
- Realtime updates are consumed through the `useRealtime` hook and the API live endpoint.

## API overview

The backend lives in [`api/`](./api) and is an Express 5 application backed by PostgreSQL.

Detailed route-by-route documentation lives in [`docs/api-reference.md`](./docs/api-reference.md).

### Entry points

- `api/src/index.ts`
  - Creates the Express server, enables CORS and cookies, exposes `/health`, mounts the API router, attaches realtime, and starts background sweeps.
- `api/src/router.ts`
  - Mounts the route groups under `/api`.

### Route groups

- `/api/public`
  - Public configuration and theme data used before login.
- `/api/auth`
  - Login, logout, session lookup, password changes, email verification, avatar updates.
- `/api/admin`
  - Onboarding bootstrap, settings, players, kudos tracks, quests, rewards, branding media, launch controls.
- `/api/tasks`
  - Quest catalog, quest detail, start quest, complete quest, queue run media.
- `/api/rewards`
  - Reward catalog, reward detail, purchases, purchase reward, redeem reward.
- `/api/activity`
  - Feed, leaderboard, run detail, run comments, run media.
- `/api/notifications`
  - Notification list and read actions.
- `/api/media`
  - Asset refresh and media download endpoints.

### Backend responsibilities

- Session and cookie-based auth.
- PostgreSQL persistence through Drizzle ORM.
- Email verification and notification email support.
- Realtime invalidation and live events.
- Quest expiry sweeping.
- Task run media processing with retry logic.
- S3-backed or object-storage-backed asset handling for avatars, content, and win media.

## Shared contracts

The [`shared/`](./shared) folder contains the TypeScript source of truth for data exchanged between the UI and API.

- `shared/contracts`
  - Domain contracts for onboarding, session data, players, points, activity, admin data, and media.
- `shared/utils/validation.ts`
  - Common validation patterns reused by both sides.
- `shared/font-presets`
  - Shared theme/font configuration used by both the UI and API.

This setup keeps payloads, route data, and route-step enums aligned across the stack.

## Prerequisites

- Node.js 20+
- `pnpm`
- PostgreSQL 16 if running the stack manually
- Docker or Podman if using the compose-based workflow

## Local development

This repo does not use a single root `package.json`. Install and run the API and web apps separately.

### 1. Install dependencies

```bash
cd api && pnpm install
cd ../web && pnpm install
```

### 2. Create environment files

```bash
cp .env.example .env
cp api/.env.example api/.env
cp web/.env.example web/.env
```

- `.env.example`
  - Used by the compose stacks from the repo root.
- `api/.env.example`
  - Used for direct API runs and loaded by the API container as an env file.
- `web/.env.example`
  - Used for split-port local frontend development.

### 3. Configure environment

For manual local development, the API reads environment from `api/.env`.

Common variables used by the API include:

- `DATABASE_URL` or `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `API_PORT` or `PORT`
- `JWT_SECRET`
- `APP_BASE_URL`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_DISPLAY_NAME`

Additional feature-specific settings are used for:

- Email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`
- CORS / origins: `FRONTEND_URL`, `ALLOW_ANY_ORIGIN`
- Media storage: `S3_BUCKET_NAME`, `AWS_REGION`, `S3_ENDPOINT`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE`, related prefix and TTL settings

For the web app:

- `VITE_API_URL` is optional.
- If omitted, the UI uses same-origin `/api`.
- For local split-port development, set it to the API base URL, for example `http://localhost:3000`.

### 4. Run database migrations

```bash
cd api
pnpm db:migrate
```

### 5. Seed the database

Standard seed:

```bash
cd api
pnpm db:seed
```

Skip-onboarding seed:

```bash
cd api
pnpm db:seed:skip-onboarding
```

The skip-onboarding seed is useful when you want a playable realm immediately without stepping through the admin setup flow.

### 6. Start the API

```bash
cd api
pnpm dev
```

By default the API listens on `3000` unless overridden by `PORT` or `API_PORT`.

### 7. Start the web app

```bash
cd web
VITE_API_URL=http://localhost:3000 pnpm dev
```

The Vite dev server runs on `5173` by default.

## Build and production-style commands

### Web

```bash
cd web
pnpm build
pnpm preview
```

### API

```bash
cd api
pnpm build
pnpm start
```

Additional API production helpers:

```bash
cd api
pnpm migrate:prod
pnpm seed:prod
```

## Docker / compose usage

### Local development stack

[`docker-compose.yml`](./docker-compose.yml) starts:

- `postgres` on `5432`
- `api` on `${API_PORT}`
- `web` on `5173`

Run it with:

```bash
docker compose up --build
```

If you use Podman:

```bash
podman compose up --build
```

### Ngrok / remote access stack

[`docker-compose.ngrok.yml`](./docker-compose.ngrok.yml) is intended for exposing the stack behind ngrok with nginx serving the frontend and proxying API traffic.

```bash
podman compose -f docker-compose.ngrok.yml up --build
ngrok http 3002
```

When using this stack:

- web is served on `http://localhost:3002`
- nginx proxies API and websocket traffic to the API container
- dynamic ngrok origins are allowed so the stack does not need rebuilding every time the public URL changes

## Typical usage flow

### Admin flow

1. Enter admin access before the realm is launched.
2. Complete onboarding: identity, players, kudos tracks, quests, rewards, launch.
3. Open the admin studio for ongoing management after launch.
4. Adjust player kudos balances, reset passwords, update themes, and curate the catalogs.

### Player flow

1. Log in and complete password setup if required.
2. Browse active and available quests.
3. Start and complete quests.
4. Earn kudos, purchase rewards, and redeem rewards.
5. Review wins, leaderboard movement, activity comments, and notifications.

## Notes

- `api/src/routes` follows a one-file-per-handler structure for easier navigation and lower-risk changes.
- `shared/` is TypeScript source, not a generated package output directory.
- The local `db/`, `private_uploads/`, package stores, build outputs, and generated shared `.js` mirrors are development artifacts and should not be committed.
