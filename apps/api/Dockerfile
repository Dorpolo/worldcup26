FROM node:22-alpine AS base
RUN npm install -g pnpm

# ── Builder ──────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /monorepo

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages/types/package.json ./packages/types/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY apps/api/package.json ./apps/api/package.json

RUN pnpm install --frozen-lockfile

COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN pnpm --filter @worldcup26/api build

# ── Runner ───────────────────────────────────────────────────────────────────
# Keep workspace symlinks alive by copying node_modules + packages together.
# packages/* export TypeScript source directly, so they must stay resolvable.
FROM base AS runner
WORKDIR /monorepo

ENV NODE_ENV=production

COPY --from=builder /monorepo/package.json ./
COPY --from=builder /monorepo/pnpm-workspace.yaml ./
COPY --from=builder /monorepo/node_modules ./node_modules
COPY --from=builder /monorepo/packages ./packages
COPY --from=builder /monorepo/apps/api/package.json ./apps/api/package.json
COPY --from=builder /monorepo/apps/api/dist ./apps/api/dist
COPY --from=builder /monorepo/apps/api/node_modules ./apps/api/node_modules

WORKDIR /monorepo/apps/api
EXPOSE 4000
CMD ["node", "dist/index.js"]
