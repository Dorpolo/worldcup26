FROM node:22-alpine AS base
RUN npm install -g pnpm

# ── Builder ──────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /monorepo

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/mcp/package.json ./apps/mcp/package.json

RUN pnpm install --frozen-lockfile --filter @worldcup26/mcp

COPY apps/mcp/ ./apps/mcp/

RUN pnpm --filter @worldcup26/mcp build

# Strip devDependencies for a clean runner install
RUN node -e "const p=JSON.parse(require('fs').readFileSync('apps/mcp/package.json','utf8'));delete p.devDependencies;require('fs').writeFileSync('apps/mcp/package.prod.json',JSON.stringify(p,null,2));"

# ── Runner ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /monorepo/apps/mcp/package.prod.json ./package.json
RUN npm install --production --ignore-scripts

COPY --from=builder /monorepo/apps/mcp/dist ./dist

EXPOSE 4001
CMD ["node", "dist/index.js"]
