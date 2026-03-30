# Build stage
FROM node:22-bookworm-slim AS builder

WORKDIR /workspace/api

RUN npm install -g pnpm@latest

COPY api/package.json api/pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY api ./
COPY shared ../shared

RUN pnpm run build

# Production stage
FROM node:22-bookworm-slim AS runner

WORKDIR /workspace/api

ENV NODE_ENV=production

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@latest

COPY api/package.json api/pnpm-lock.yaml ./

RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /workspace/api/dist ./dist
COPY --from=builder /workspace/api/scripts ./scripts
COPY --from=builder /workspace/api/src/db ./src/db
COPY --from=builder /workspace/api/drizzle ./drizzle

# Copy entrypoint script
COPY api/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]
