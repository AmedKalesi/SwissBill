# ============================================
# flinkli — Birleşik Production Dockerfile (Railway, repo root)
# ============================================
# Bu Dockerfile repo kökünde durur ve HER İKİ servis tarafından da kullanılır.
# Railway servis ayarında Dockerfile Path = "Dockerfile" (kök) kalsa bile
# doğru imaj üretilir: runtime'da RAILWAY_SERVICE_NAME'e bakarak
#   - web servisi  -> nginx ile statik Vite build'ini sunar
#   - api servisi  -> node ile Fastify sunucusunu başlatır
# Böylece panelde servis başına Dockerfile Path değiştirmeye gerek kalmaz.
FROM node:22-alpine AS base
# Prisma, alpine üzerinde OpenSSL 3.x gerektirir (schema engine için)
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@12.8.1 --activate
WORKDIR /app

# --- Bağımlılıkları kur ---
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

# --- Derle (shared + api + web) ---
FROM deps AS build
COPY . .
RUN pnpm --filter @flinkli/shared build \
  && pnpm --filter api db:generate \
  && pnpm --filter api build \
  && pnpm --filter @flinkli/web build

# --- Çalıştır ---
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/apps/web ./apps/web
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# nginx + gettext (envsubst) kur — web servisi için.
# envsubst, nginx template'indeki ${PORT} placeholder'ını doldurur.
RUN apk add --no-cache nginx gettext

# Web statik dosyalarını nginx'in beklediği yere kopyala
RUN mkdir -p /usr/share/nginx/html \
  && cp -r /app/apps/web/dist/. /usr/share/nginx/html/ \
  && mkdir -p /etc/nginx/templates \
  && cp /app/apps/web/nginx.conf /etc/nginx/templates/default.conf.template

# Servis-bilinçli başlatma script'i:
# RAILWAY_SERVICE_NAME "web" içeriyorsa nginx, aksi halde API sunucusu.
RUN printf '%s\n' \
  '#!/bin/sh' \
  'set -e' \
  'SVC="${RAILWAY_SERVICE_NAME:-api}"' \
  'case "$SVC" in' \
  '  *web*)' \
  '    echo "[flinkli] web servisi -> nginx baslatiliyor (PORT=${PORT:-80})"' \
  '    export PORT="${PORT:-80}"' \
  '    # nginx template -> conf.d (envsubst ile ${PORT} doldurulur)' \
  '    envsubst "\$PORT" < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf' \
  '    exec nginx -g "daemon off;"' \
  '    ;;' \
  '  *)' \
  '    echo "[flinkli] api servisi -> migration + node baslatiliyor"' \
  '    cd /app/apps/api' \
  '    pnpm db:deploy' \
  '    exec node dist/server.js' \
  '    ;;' \
  'esac' \
  > /usr/local/bin/start.sh \
  && chmod +x /usr/local/bin/start.sh

EXPOSE 4000 80
CMD ["/usr/local/bin/start.sh"]
