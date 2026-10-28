# ==============================================================================
# Multi-stage Dockerfile for EOTC Learning Platform Web (Next.js 15 PWA)
# ==============================================================================

# STAGE 1: Build & Prepare
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Copy monorepo configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web

# Install dependencies
RUN pnpm install --frozen-lockfile --filter "@eotc/shared" --filter "@eotc/web"

# Build shared package
RUN pnpm --filter "@eotc/shared" build

# Build Next.js Web Application
WORKDIR /app/apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# STAGE 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache dumb-init

# Copy built application and required assets
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next ./apps/web/.next

USER node

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
WORKDIR /app/apps/web
CMD ["node_modules/.bin/next", "start", "-p", "3001"]
