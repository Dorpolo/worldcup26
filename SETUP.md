# World Cup 2026 — Phase 1 Setup Guide

This document tells you exactly what **you** need to do to get Phase 1 running. Every step has a verification command so you know it worked before moving on.

---

## Step 0 — Prerequisites (one-time installs)

Open Terminal and run each check. If a command fails, the install link is next to it.

```bash
node --version     # Must be 20+  →  https://nodejs.org (LTS)
pnpm --version     # Must be 9+   →  npm install -g pnpm
git --version      # Any version  →  https://git-scm.com
```

---

## Step 1 — Create the GitHub Repository

1. Go to **https://github.com/Dorpolo** (your GitHub account)
2. Click **New repository**
3. Name it: `worldcup26`
4. Set visibility: **Private** (you can make it public later)
5. Do NOT add a README, .gitignore, or license — we already have those
6. Click **Create repository**
7. Copy the repo URL (e.g. `git@github.com:Dorpolo/worldcup26.git`)

Then in Terminal, from `/Users/dorpolo/dev/worldcup26`:

```bash
git init
git add .
git commit -m "feat: initial project scaffold (Phase 1)"
git branch -M main
git remote add origin git@github.com:Dorpolo/worldcup26.git
git push -u origin main
```

**Verify:** Go to https://github.com/Dorpolo/worldcup26 — you should see all files.

---

## Step 2 — Install Dependencies

```bash
cd /Users/dorpolo/dev/worldcup26
pnpm install
```

**Verify:**
```bash
ls node_modules/.modules.yaml   # should exist
ls apps/web/node_modules        # should exist
```

---

## Step 3 — Install shadcn/ui Components

This installs the pre-built UI components into `apps/web`:

```bash
cd apps/web
npx shadcn@latest init
```

When prompted, answer:
- Style: **Default**
- Base color: **Slate**
- CSS variables: **Yes**

Then install the components we use:

```bash
npx shadcn@latest add button input label card badge avatar separator tabs toast
cd ../..
```

**Verify:** `ls apps/web/components/ui` — you should see `button.tsx`, `card.tsx`, etc.

---

## Step 4 — Set Up MongoDB (local for development)

**Option A (easiest): MongoDB Atlas free cloud DB**

1. Go to **https://cloud.mongodb.com** → Sign up free
2. Create a free **M0 cluster** (512 MB, always free)
3. Click **Connect** → **Drivers** → copy the connection string
4. It looks like: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/worldcup26`

**Option B: Local MongoDB**

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
# Connection string: mongodb://localhost:27017/worldcup26
```

---

## Step 5 — Set Up Upstash Redis

1. Go to **https://upstash.com** → Sign up free (Google login works)
2. Click **Create Database**
3. Name: `worldcup26`, Region: `US-East-1` (or closest to you)
4. Type: **Regional** (not global — cheaper)
5. Click **Create**
6. In the database dashboard, find **REST API** section
7. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
8. Also copy the Redis URL (starts with `rediss://`) for the Express server → this is `REDIS_URL`

---

## Step 6 — Set Up Resend (email magic links)

1. Go to **https://resend.com** → Sign up free
2. Free tier: 3,000 emails/month (enough for dev + small user base)
3. Go to **API Keys** → Create API Key → name it `worldcup26`
4. Copy the key (starts with `re_...`)
5. **Optional for now:** Add your domain in Resend → DNS → add the 3 DNS records to your registrar
   - Without a custom domain, emails come from `onboarding@resend.dev` which is fine for testing

---

## Step 7 — Set Up Google OAuth

1. Go to **https://console.cloud.google.com**
2. Create a new project named `worldcup26`
3. Go to **APIs & Services** → **OAuth consent screen**
   - User type: External
   - App name: `World Cup 2026 Predictions`
   - Add your email as a test user
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Copy **Client ID** and **Client Secret**

---

## Step 8 — Create Your .env File

```bash
cd /Users/dorpolo/dev/worldcup26
cp .env.example apps/web/.env.local
```

Open `apps/web/.env.local` and fill in:

```bash
# Generate a random secret:
openssl rand -base64 32
# Paste the output as NEXTAUTH_SECRET

NEXTAUTH_SECRET=<paste-here>
NEXTAUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID=<from-step-7>
GOOGLE_CLIENT_SECRET=<from-step-7>

MONGODB_URI=<from-step-4>

UPSTASH_REDIS_REST_URL=<from-step-5>
UPSTASH_REDIS_REST_TOKEN=<from-step-5>
REDIS_URL=<rediss://... from-step-5>

RESEND_API_KEY=<from-step-6>
EMAIL_FROM=onboarding@resend.dev

CRON_SECRET=<another-random-string: openssl rand -base64 16>
INTERNAL_API_KEY=<another-random-string>

# Leave these blank for now (Phase 7):
ANTHROPIC_API_KEY=
TAVILY_API_KEY=
API_FOOTBALL_KEY=

# Leave Railway URLs as localhost for now:
RAILWAY_EXPRESS_URL=http://localhost:4000
RAILWAY_AGENT_URL=http://localhost:8000
```

Also create `apps/api/.env`:

```bash
MONGODB_URI=<same as above>
REDIS_URL=<same REDIS_URL from step 5>
NEXTAUTH_URL=http://localhost:3000
PORT=4000
```

---

## Step 9 — Run the App

Open **two terminal windows**:

**Terminal 1 — Next.js web app:**
```bash
cd /Users/dorpolo/dev/worldcup26
pnpm --filter @worldcup26/web dev
```

**Terminal 2 — Express API (WebSocket server):**
```bash
cd /Users/dorpolo/dev/worldcup26
pnpm --filter @worldcup26/api dev
```

---

## Step 10 — Verify Everything Works

Work through this checklist:

### ✅ Check 1: App loads
Open **http://localhost:3000**

You should see the dark blue login screen with a football emoji and "World Cup 2026".

### ✅ Check 2: Google Sign-In
Click **Continue with Google** → sign in with your Google account.

You should land on the leagues page (empty state with "You're not in any leagues yet").

### ✅ Check 3: User was created in MongoDB

In MongoDB Atlas: **Browse Collections** → `worldcup26` database → `users` collection.
You should see your user document with your email, name, and a generated `apiKey`.

### ✅ Check 4: Create a league
Click **Create a league** → Enter a name → Submit.

You should be redirected to the league page with the chat tab (AI assistant stub).

### ✅ Check 5: Check the tabs
Click through the tabs: **Chat, Leaderboard, Predictions, Cup, Stats, Rules**.

All should load without errors. Rules should show the default scoring config in a readable format.

### ✅ Check 6: Express API health
```bash
curl http://localhost:4000/health
# Expected: {"ok":true,"service":"worldcup26-api"}
```

### ✅ Check 7: Invite link
(From the league you created)

In your browser, open DevTools → Network → POST to `/api/leagues/{id}/invites` manually, or we'll wire up the settings UI in Phase 2.

---

## Step 11 — Deploy to Vercel (optional, do after local works)

**Prerequisites:**
1. Install Vercel CLI: `npm install -g vercel`
2. Sign up at **https://vercel.com** with your GitHub account (Dorpolo)

```bash
cd apps/web
vercel
```

Follow the prompts:
- Link to existing project? **No** → create new
- Project name: `worldcup26`
- Root directory: `./` (already in apps/web)
- Override settings? **No**

Then add all environment variables in the Vercel dashboard:
- Go to your project → **Settings** → **Environment Variables**
- Add every variable from your `.env.local` file
- Add one more: `NEXTAUTH_URL=https://worldcup26.vercel.app` (or your custom domain)

**Add GitHub Secrets for CI/CD auto-deploy:**

```bash
vercel link   # links the project
vercel env pull   # shows project/org IDs
```

Go to https://github.com/Dorpolo/worldcup26/settings/secrets → add:
- `VERCEL_TOKEN`: get from vercel.com → Account Settings → Tokens
- `VERCEL_ORG_ID`: from `vercel env pull` output
- `VERCEL_PROJECT_ID`: from `vercel env pull` output

From now on, every push to `main` auto-deploys.

---

## Step 12 — Deploy Express API to Railway (optional, after Vercel works)

1. Go to **https://railway.app** → Login with GitHub
2. **New Project** → **Deploy from GitHub repo** → Select `Dorpolo/worldcup26`
3. When asked for root directory → type `apps/api`
4. Railway will detect it's a Node.js app
5. Go to **Variables** tab → add all the env vars from `apps/api/.env`
6. Go to **Settings** → **Networking** → **Generate Domain** → copy the URL
7. Update `RAILWAY_EXPRESS_URL` in your Vercel project's env vars to that URL

**Add MongoDB plugin:**
- In Railway project → **+ New** → **Database** → **MongoDB**
- Railway injects `MONGODB_URL` automatically — use this as `MONGODB_URI`

---

## What's Built So Far (Phase 1 Complete)

| Feature | Status |
|---|---|
| Monorepo with Turborepo | ✅ |
| TypeScript types (shared) | ✅ |
| Scoring engine (shared) | ✅ |
| Cup formula (shared) | ✅ |
| All 7 Mongoose schemas | ✅ |
| NextAuth (Google + magic link) | ✅ |
| User auto-creation on sign-in | ✅ |
| League create + sidebar nav | ✅ |
| Invite token generation | ✅ |
| Join via invite link | ✅ |
| Leaderboard page (DB-driven) | ✅ |
| Rules page (auto-generated) | ✅ |
| Predictions API (with lock check) | ✅ |
| Match sync cron (API-Football) | ✅ |
| Lock predictions cron | ✅ |
| Score calculation cron | ✅ |
| Leaderboard Redis cache | ✅ |
| Rate limiting on predictions | ✅ |
| Express + Socket.io server | ✅ |
| Redis pub/sub → WebSocket bridge | ✅ |
| GitHub Actions CI/CD | ✅ |

---

## What's Next (Phase 2)

In the next session we'll build:
1. **Match sync** — run the cron once to populate all 64 WC2026 fixtures from API-Football
2. **Predictions UI** — the match grid where you pick scores
3. **Lock countdown** — live timer per match card
4. **Scoring config UI** — owner edits group/knockout/bonus points
5. **Settings page** — invite link generator visible in the UI
6. **Bonus predictions** — tournament winner, top scorer, top assist pickers

When you're ready to continue, just say "Phase 2" and we'll start from here.
