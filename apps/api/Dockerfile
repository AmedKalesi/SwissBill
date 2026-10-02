# ============================================
# flinkli API — Production Dockerfile (Railway)
# ============================================
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@12.8.1 --activate
WORKDIR /app

# --- Bağımlılıkları kur ---
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

# --- Derle ---
FROM deps AS build
COPY . .
RUN pnpm --filter @flinkli/shared build \
  && pnpm --filter api db:generate \
  && pnpm --filter api build

# --- Çalıştır ---
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

WORKDIR /app/apps/api
EXPOSE 4000

# Migration'ları uygula ve sunucuyu başlat
CMD ["sh", "-c", "pnpm db:deploy && node dist/server.js"]
