FROM node:22-alpine AS base
RUN npm install -g pnpm

# ── Builder ──────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /monorepo

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages/types/package.json ./packages/types/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY apps/api/package.json ./apps/api/package.json

RUN pnpm install --frozen-lockfile

COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# tsup reads tsup.config.ts which sets noExternal for @worldcup26/* workspace packages
RUN pnpm --filter @worldcup26/api build

# Strip workspace:* deps so the runner can npm install cleanly
RUN node -e "const p=JSON.parse(require('fs').readFileSync('apps/api/package.json','utf8'));p.dependencies=Object.fromEntries(Object.entries(p.dependencies||{}).filter(([,v])=>!v.startsWith('workspace:')));delete p.devDependencies;require('fs').writeFileSync('apps/api/package.prod.json',JSON.stringify(p,null,2));"

# ── Runner ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /monorepo/apps/api/package.prod.json ./package.json
RUN npm install --production --ignore-scripts

COPY --from=builder /monorepo/apps/api/dist ./dist

EXPOSE 4000
CMD ["node", "dist/index.js"]
