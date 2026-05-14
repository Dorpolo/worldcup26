FROM node:22-alpine AS base
RUN npm install -g pnpm

# ── Builder ──────────────────────────────────────────────────────────────────
# MCP has no workspace dependencies — build context is the repo root so we can
# reference the root pnpm-lock.yaml for a reproducible install.
FROM base AS builder
WORKDIR /monorepo

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/mcp/package.json ./apps/mcp/package.json

RUN pnpm install --frozen-lockfile --filter @worldcup26/mcp

COPY apps/mcp/ ./apps/mcp/

RUN pnpm --filter @worldcup26/mcp build

# ── Runner ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /monorepo/apps/mcp/dist ./dist
COPY --from=builder /monorepo/apps/mcp/package.json ./
COPY --from=builder /monorepo/apps/mcp/node_modules ./node_modules

EXPOSE 4001
CMD ["node", "dist/index.js"]
