# Required GitHub Secrets

Add these in: **GitHub repo → Settings → Secrets and variables → Actions**

---

## Vercel (web deployment)

| Secret | How to get it |
|--------|--------------|
| `VERCEL_TOKEN` | vercel.com → Account Settings → Tokens → Create |
| `VERCEL_ORG_ID` | Run `npx vercel link` in `apps/web`, then check `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Same as above |

---

## Application secrets (set in both GitHub AND Railway dashboard)

| Secret | How to generate |
|--------|----------------|
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `API_FOOTBALL_KEY` | api-football.com dashboard |
| `TAVILY_API_KEY` | app.tavily.com |
| `RESEND_API_KEY` | resend.com dashboard |
| `GOOGLE_CLIENT_ID` | console.cloud.google.com → OAuth 2.0 credentials |
| `GOOGLE_CLIENT_SECRET` | Same as above |
| `INTERNAL_API_KEY` | `openssl rand -hex 32` |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |

---

## Railway (set directly in Railway dashboard — not needed in GitHub)

Railway injects these automatically. No GitHub secret needed for Railway:

- `MONGODB_URI` — from Railway MongoDB plugin (auto-injected)
- `REDIS_URL` — from Railway Redis plugin (auto-injected)
- `PORT` — set per-service (api=4000, agent=8000, mcp=4001)
- All app secrets above — copy into Railway → Variables → Shared

---

## Notes

- Railway backend services deploy automatically when you push to `main` — Railway watches GitHub directly. No GitHub Actions job needed.
- GitHub Actions only deploys Vercel (web).
- For production releases: create a GitHub Release with tag `v1.x.x` → triggers production Vercel deploy + smoke test.
