# --- Build stage: build @flinkli/shared then the Vite web app ---
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@12.8.1 --activate
WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

# Copy the rest of the source and build shared + web
COPY . .
RUN pnpm --filter @flinkli/shared build \
  && pnpm --filter @flinkli/web build

# --- Runtime stage: serve the static build with nginx ---
FROM nginx:1.27-alpine AS runner
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
