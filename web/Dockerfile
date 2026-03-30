FROM node:22-bookworm-slim

WORKDIR /workspace/web

RUN npm install -g pnpm@latest

COPY web/package.json web/pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY web ./
COPY shared ../shared

EXPOSE 5173

CMD ["sh", "-c", "pnpm install --frozen-lockfile --config.confirmModulesPurge=false && pnpm run dev -- --host"]
