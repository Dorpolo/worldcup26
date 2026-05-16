FROM node:22-alpine AS base
RUN npm install -g pnpm

# ── Builder ──────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /monorepo

# Workspace manifests first (better layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages/types/package.json ./packages/types/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --frozen-lockfile

# Source
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

RUN pnpm --filter web build

# ── Runner ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# next build --standalone copies everything needed into .next/standalone
COPY --from=builder /monorepo/apps/web/.next/standalone ./
COPY --from=builder /monorepo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /monorepo/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
