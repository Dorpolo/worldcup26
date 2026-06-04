# Deployment Runbook — Polo Market (polomarket.gg)

Production deployment for the World Cup 2026 predictions platform.

> **Active path: Railway + Vercel.** The `infra/` directory (AWS ECS/Terraform) is a
> separate, dormant deployment path and is **not** used here. Do not mix the two.

## Architecture

```
Users → https://polomarket.gg            (Vercel: Next.js web + Vercel Cron)
            │
            ├──→ api.* / NEXT_PUBLIC_API_URL   (Railway: Express + Socket.io)
            ├──→ RAILWAY_AGENT_URL             (Railway: Python LangGraph agent)
            └──→ MCP_SERVER_URL                (Railway: Node MCP server)
                        │
        MongoDB Atlas (M0 free)  +  Upstash Redis (free tier)
```

| Component | Host | Source | Port |
|-----------|------|--------|------|
| web | Vercel | `apps/web` | — |
| api | Railway | `apps/api` (Dockerfile) | 4000 |
| agent | Railway | `apps/agent` (Dockerfile) | 8000 |
| mcp | Railway | `apps/mcp` (Dockerfile) | 4001 |
| MongoDB | MongoDB Atlas | — | — |
| Redis | Upstash | — | — |

CI/CD: `.github/workflows/deploy.yml` deploys **web** to Vercel on push to `main`
(staging) and on a published GitHub release (production). Railway auto-deploys the
three backend services directly from GitHub.

---

## Phase 1 — Managed data stores (do first; everything depends on these)

### MongoDB Atlas
1. Create a free **M0** cluster at https://cloud.mongodb.com (sign in with GitHub/Dorpolo).
2. Database Access → add a user (e.g. `polomarket`) with a strong password.
3. Network Access → allow `0.0.0.0/0` (Railway egress IPs are dynamic on the free/hobby plan).
4. Copy the connection string → this is **`MONGODB_URI`**. Append the DB name:
   `mongodb+srv://polomarket:<pw>@<cluster>.mongodb.net/worldcup26?retryWrites=true&w=majority`

### Upstash Redis
1. Create a database at https://console.upstash.com (sign in with GitHub).
2. From the database page, copy:
   - **`UPSTASH_REDIS_REST_URL`** + **`UPSTASH_REDIS_REST_TOKEN`** (REST tab — used by the web app)
   - **`REDIS_URL`** (the `redis://...` connection string — used by the api service)

---

## Phase 2 — Secrets (generate once)

Already generated for this deployment (regenerate with the commands below if you lose them):

```bash
openssl rand -base64 32   # AUTH_SECRET
openssl rand -hex 32      # CRON_SECRET
openssl rand -hex 32      # INTERNAL_API_KEY   (must be IDENTICAL across web, mcp, agent)
```

External keys you also need:
- `ANTHROPIC_API_KEY` — console.anthropic.com
- `API_FOOTBALL_KEY` (+ `API_FOOTBALL_BASE_URL`) — api-football.com
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google Cloud Console OAuth
- `RESEND_API_KEY` (+ `EMAIL_FROM`) — resend.com (magic-link email)
- `POLLY_MARKET_API_KEY` / `POLLY_MARKET_BASE_URL` — Polly Market
- `TAVILY_API_KEY`, `LANGCHAIN_API_KEY` — optional (agent web search / LangSmith tracing)

---

## Phase 3 — Railway (api, agent, mcp)

1. https://railway.app → **New Project → Deploy from GitHub repo → `Dorpolo/worldcup26`**.
2. Railway reads `railway.toml` and creates 3 services. For each, set **Root Directory** and
   confirm the Dockerfile path:
   - `api`   → `apps/api`   (Dockerfile `apps/api/Dockerfile`)
   - `agent` → `apps/agent` (Dockerfile `apps/agent/Dockerfile`)
   - `mcp`   → `apps/mcp`   (Dockerfile `apps/mcp/Dockerfile`)
3. Set **shared variables** (Project → Variables) and the per-service vars below.
4. Generate a public domain for each service (Settings → Networking → Generate Domain).
   Note the three URLs — the web app needs them.

### Per-service env vars (Railway)

**Shared (all three):**
```
MONGODB_URI=<Atlas URI>
INTERNAL_API_KEY=<generated>
NEXTAUTH_URL=https://polomarket.gg
```

**api:**
```
PORT=4000
REDIS_URL=<Upstash redis:// URL>
```

**agent:**
```
PORT=8000
ANTHROPIC_API_KEY=<key>
ANTHROPIC_MODEL=claude-haiku-4-5
INTERNAL_API_URL=https://polomarket.gg
TAVILY_API_KEY=<optional>
LANGCHAIN_API_KEY=<optional>
LANGCHAIN_PROJECT=world-cup-26
```

**mcp:**
```
PORT=4001
NEXT_PUBLIC_APP_URL=https://polomarket.gg
```

Verify each: `https://<service>.up.railway.app/health` → `200` (mcp/api), agent `/health` → `200`.

---

## Phase 4 — Vercel (web)

1. https://vercel.com → **Add New Project → import `Dorpolo/worldcup26`**.
2. **Root Directory = `apps/web`**. Framework: Next.js (auto). Build uses the monorepo
   pnpm workspace — keep the default Vercel build, or set install to `pnpm install`.
3. Add env vars (below) for **Production** (and Preview if you want staging).
4. Deploy. `apps/web/vercel.json` registers the 4 cron jobs automatically.

### Env vars (Vercel)
```
MONGODB_URI=<Atlas URI>
UPSTASH_REDIS_REST_URL=<Upstash REST URL>
UPSTASH_REDIS_REST_TOKEN=<Upstash REST token>
AUTH_SECRET=<generated>
NEXTAUTH_URL=https://polomarket.gg
GOOGLE_CLIENT_ID=<key>
GOOGLE_CLIENT_SECRET=<key>
RESEND_API_KEY=<key>
EMAIL_FROM=<noreply@polomarket.gg>
ANTHROPIC_API_KEY=<key>
API_FOOTBALL_KEY=<key>
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io
CRON_SECRET=<generated>
INTERNAL_API_KEY=<generated, same as Railway>
MCP_SERVER_URL=https://<mcp>.up.railway.app
RAILWAY_AGENT_URL=https://<agent>.up.railway.app
NEXT_PUBLIC_API_URL=https://<api>.up.railway.app
POLLY_MARKET_API_KEY=<key>
POLLY_MARKET_BASE_URL=<url>
```

---

## Phase 5 — Domain, OAuth, email

1. **DNS**: point `polomarket.gg` at Vercel (A/ALIAS per Vercel's domain UI). Add the domain
   in Vercel → Settings → Domains.
2. **Google OAuth**: in Google Cloud Console add authorized redirect URI
   `https://polomarket.gg/api/auth/callback/google` and JS origin `https://polomarket.gg`.
3. **Resend**: verify the `polomarket.gg` sending domain (SPF/DKIM records).

---

## Phase 6 — GitHub Actions secrets (for CI auto-deploy of web)

Set in the GitHub web UI (Settings → Secrets and variables → Actions), repo or `staging`/`production` environment:
- `VERCEL_TOKEN` (Vercel → Account Settings → Tokens)
- `VERCEL_ORG_ID` + `VERCEL_PROJECT_ID` (from `apps/web/.vercel/project.json` after first `vercel link`, or Vercel project settings)

> Note: the `deploy.yml` smoke-test hits `https://polomarket.gg/api/health` (prod) and
> `https://staging.polomarket.gg/api/health` (staging). Ensure those resolve, or adjust.

---

## Phase 7 — Go live & verify

1. Merge the deploy branch into `main` → triggers staging deploy.
2. Publish a GitHub release (e.g. `v1.0.0`) → triggers production deploy (`--prod`).
3. Verify:
   - `https://polomarket.gg` loads, login works (Google + magic link)
   - Create a league, place a prediction
   - `https://polomarket.gg/api/health` → `200`
   - Railway: all 3 services healthy
   - Cron: check Vercel → Project → Cron logs after a few minutes
   - Realtime: open two clients, confirm live updates via the api Socket.io service

## Notes
- `INTERNAL_API_KEY` **must match** across web, mcp, and agent (it authenticates
  service-to-service calls back to the web app's internal API).
- First sync: trigger `/api/cron/sync-matches` (or wait for the 5-min cron) to populate fixtures.
- Keep `infra/` (AWS) untouched unless you deliberately migrate off Railway later.
