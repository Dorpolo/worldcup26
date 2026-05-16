# Bobby — Developer Documentation

> **Purpose:** Full technical reference for contributors. Focuses on competition logic, data models, and system architecture.  
> **Stack:** Next.js 15 · FastAPI · LangGraph · MongoDB · Redis · Socket.io

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Scoring Engine](#2-scoring-engine)
3. [Cup Competition Logic](#3-cup-competition-logic)
4. [Database Models](#4-database-models)
5. [API Routes](#5-api-routes)
6. [AI Agent Architecture](#6-ai-agent-architecture)
7. [Cron Jobs](#7-cron-jobs)
8. [Real-Time Architecture](#8-real-time-architecture)
9. [Frontend Pages](#9-frontend-pages)
10. [Environment Variables](#10-environment-variables)
11. [Development Setup](#11-development-setup)
12. [Data Flow Walkthroughs](#12-data-flow-walkthroughs)

---

## 1. System Overview

Bobby is a **friend-group prediction league** platform for the FIFA World Cup 2026. Key features:

- **Predictions** — submit score predictions for all 64 matches, locked 15 min before kickoff
- **Leaderboard** — points-based rankings updated live as matches finish
- **Bonus Predictions** — tournament winner, top scorer, top assist, custom bonuses
- **Cup Competition** — parallel bracket tournament seeded by knockout-stage performance
- **Bobby** — agentic chat with full league context, long-term memory, and custom skills

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js (Vercel / port 3000)              │
│  App Router UI  ·  API Routes  ·  Cron endpoints            │
└────────────┬────────────────────────────────┬───────────────┘
             │ REST/SSE                        │ REST
     ┌───────▼────────┐               ┌────────▼────────┐
     │  FastAPI Agent │               │ Express + WS    │
     │  (port 8000)   │               │  (port 4000)    │
     └───────┬────────┘               └────────┬────────┘
             │                                 │ Redis pub/sub
     ┌───────▼────────────────────────────────▼──────────┐
     │                  MongoDB  ·  Redis                  │
     └────────────────────────────────────────────────────┘
```

### Technology Choices

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend + API | Next.js 15 (App Router) | Full-stack, SSR, API routes, streaming |
| Real-time | Express + Socket.io | Persistent WebSocket connections (not possible on Vercel) |
| AI Agent | FastAPI + LangGraph ≥0.2 | Streaming ReAct loop, dynamic tool composition |
| LLM | Claude Haiku (Anthropic) | Fast, cheap, tool-calling |
| Database | MongoDB + Mongoose | Flexible schema, aggregation pipelines for rankings |
| Cache / PubSub | Redis | Leaderboard sorted sets, pub/sub for live updates |
| Football Data | api-football.com | World Cup 2026 coverage, free dev tier |

---

## 2. Scoring Engine

### 2.1 Scoring Configuration

Every league has a **`scoringConfig`** object (owner can customise before the tournament starts). The default:

```typescript
// packages/config/src/scoring-defaults.ts
{
  groupStage: {
    exactScore:    3,   // exact scoreline
    correctResult: 1,   // correct winner / draw (if not exact)
  },
  knockoutStage: {
    exactScore:    4,
    correctResult: 2,
    correctTeamAdvancing: 1,  // picked the right team to advance
  },
  bonuses: {
    tournamentWinner: { enabled: true, points: 10 },
    topScorer:        { enabled: true, points: 5  },
    topAssist:        { enabled: true, points: 5  },
    custom: [],        // owner-defined bonuses
  },
}
```

### 2.2 Point Calculation Rules

Points for a single prediction are calculated as follows (mutually exclusive for exact vs. result):

```
if prediction == actual scoreline:
    points += exactScore          ← only this, not correctResult
else if predicted outcome (W/D/L) == actual outcome:
    points += correctResult

if knockout stage AND predicted advancing team == actual advancing team:
    points += correctTeamAdvancing    ← applies regardless of above
```

**Key edge cases:**
- A prediction of `1-0` and result `2-0` → correct result (home win), not exact → `+correctResult` only
- Penalty shootout winner counts for `correctTeamAdvancing` regardless of the predicted score in 90 mins
- If `correctTeamAdvancing = 0` in the config, that bonus is disabled entirely
- Bonus predictions (tournament winner, top scorer) are scored independently by cron once the tournament ends

### 2.3 Scoring Code Location

| File | Purpose |
|------|---------|
| `packages/config/src/scoring-defaults.ts` | Default config values |
| `apps/web/lib/scoring.ts` | `calculatePredictionPoints()` function |
| `apps/web/app/api/cron/calculate-scores/route.ts` | Cron that applies scoring to all predictions after a match |

**`calculatePredictionPoints` signature:**

```typescript
function calculatePredictionPoints(
  predHomeScore: number,
  predAwayScore: number,
  result: { homeScore: number; awayScore: number; winner: string | null; penaltyWinner?: string },
  stage: MatchStage,
  config: ScoringConfig
): { points: number; breakdown: { exactScore: boolean; correctResult: boolean; correctTeamAdvancing: boolean } }
```

### 2.4 Rank Calculation

After scoring runs for a match:
1. All `Membership.totalPoints` values in the league are recalculated (incremented by `pointsEarned`)
2. All members are sorted by `totalPoints` DESC, rank assigned 1..N
3. Each rank update appends a `pointsHistory` entry (for trend charts)
4. Redis leaderboard sorted set `leaderboard:{leagueId}` is rebuilt

---

## 3. Cup Competition Logic

The cup runs **in parallel** with the main table. It is a bracket tournament where points are earned from World Cup knockout stage matches.

### 3.1 Bracket Sizing

Bracket size = **largest power of 2 that is ≤ member count** (capped at 32).

```typescript
// packages/config/src/cup-formula.ts
function getCupConfig(memberCount: number) {
  const bracketSize = Math.min(
    Math.pow(2, Math.floor(Math.log2(memberCount))),
    32
  )
  // ...
}
```

| Members | Bracket | Start Round     | Byes |
|---------|---------|-----------------|------|
| 2       | 2       | Final           | 0    |
| 3–4     | 4       | Semi-Final      | 0–1  |
| 5–8     | 8       | Quarter-Final   | 0–3  |
| 9–16    | 16      | Round of 16     | 0–7  |
| 17–32   | 32      | Round of 32     | 0–15 |
| 33+     | 32      | Round of 32     | 1+   |

**Byes:** If members > bracketSize, the top `members - bracketSize` players (by current league table rank) get a bye in round 1 — they advance automatically without playing.

### 3.2 Cup Round → World Cup Stage Mapping

Each cup round's points are earned from the **corresponding WC knockout stage**:

| Cup Round      | Points From WC Stage       |
|----------------|---------------------------|
| Round of 32    | Group stage top 16 + R16  |
| Round of 16    | WC Round of 16            |
| Quarter-Final  | WC Quarter-Finals         |
| Semi-Final     | WC Semi-Finals            |
| Final          | WC Final (+ 3rd place)    |

### 3.3 Matchup Points

For each cup matchup, a player's **matchup score** = sum of all their `pointsEarned` on predictions for matches in the relevant World Cup stage.

Example: In the Cup Quarter-Final, a player's score = sum of points they earned on the 4 WC quarter-final matches.

### 3.4 Tiebreakers

Applied in order when matchup scores are equal:

1. **Goals Predicted** — sum of `(homeScore + awayScore)` across all predictions in the stage. Higher total wins.
2. **Random** — seeded by `matchupId` hash for determinism (same result on every recalculation).

```typescript
// apps/web/lib/cup-advance.ts
function resolveMatchup({ homePoints, awayPoints, homeGoalsPredicted, awayGoalsPredicted, matchupId }) {
  if (homePoints !== awayPoints)
    return { winnerId: homePoints > awayPoints ? homeUserId : awayUserId }

  if (homeGoalsPredicted !== awayGoalsPredicted)
    return { winnerId: ..., tiebreakerUsed: 'goals_predicted' }

  const seed = matchupId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return { winnerId: seed % 2 === 0 ? homeUserId : awayUserId, tiebreakerUsed: 'random' }
}
```

### 3.5 Bracket Advancement Process

Triggered by `POST /api/cron/cup-advance` (or manually by owner via `/api/leagues/[id]/cup/advance`):

```
1. Find all active CupBracket documents

2. For each bracket, get current round

3. Check: are ALL World Cup matches in this round's stage finished + scored?
   → No  : skip (come back next cron tick)
   → Yes : continue

4. For each matchup in the round:
   a. Sum each user's pointsEarned on stage match predictions
   b. Call resolveMatchup() → get winner (+ tiebreaker metadata)
   c. Mark matchup.winnerId, matchup.tiebreakerUsed

5. Collect advancing users (winners + bye players from this round)

6. Build next round matchups:
   - Sort advancing users (winners in bracket order)
   - Pair: 1st vs 2nd, 3rd vs 4th, …
   - If odd count → last user gets a bye (isBye: true, auto-advances)

7. If this was the Final round:
   - bracket.status = 'completed'
   - bracket.winnerId = final matchup winner

8. Save to MongoDB
```

### 3.6 Cup Bracket Schema

```typescript
// packages/db/src/models/CupBracket.ts
{
  leagueId:   ObjectId,
  status:     'pending' | 'active' | 'completed',
  startRound: 'round_of_32' | 'round_of_16' | 'quarter_final' | 'semi_final' | 'final',
  rounds: [{
    roundNumber:   number,
    roundName:     string,     // "Quarter Finals"
    worldCupStage: MatchStage, // maps to Match.stage
    status:        'pending' | 'active' | 'completed',
    matchups: [{
      _id:            ObjectId,
      homeUserId:     ObjectId,
      awayUserId:     ObjectId | null,  // null = bye
      homePoints:     number,
      awayPoints:     number,
      winnerId?:      ObjectId,
      tiebreakerUsed?: 'goals_predicted' | 'random',
      isBye:          boolean,
    }]
  }],
  winnerId?: ObjectId,
}
```

---

## 4. Database Models

All files in `packages/db/src/models/`.

### 4.1 User

```typescript
{
  email:        string,          // unique, indexed
  name:         string,
  avatar:       string,          // URL
  timezone:     string,          // default: 'UTC'
  authProvider: 'email' | 'google',
  googleId?:    string,          // sparse indexed
  apiKey:       string,          // nanoid(32), for programmatic access
  aiApiKey?:    string,          // user-supplied Anthropic/OpenAI key
}
```

### 4.2 League

```typescript
{
  name:     string,
  slug:     string,          // unique URL slug
  avatar:   string,
  ownerId:  ObjectId,        // ref: User
  scoringConfig: ScoringConfig,
  inviteTokens: [{ token, expiresAt, usedBy[] }],
  status:    'draft' | 'active' | 'completed',
  cupStatus: 'pending' | 'active' | 'completed',
  memberCount: number,       // denormalized
}
```

### 4.3 Membership

```typescript
{
  userId:   ObjectId,        // compound unique with leagueId
  leagueId: ObjectId,
  role:     'owner' | 'member',
  totalPoints: number,       // denormalized, updated after each match
  rank:        number,       // 1 = first place, recalculated after each match
  pointsHistory: [{
    matchId:          ObjectId,
    pointsEarned:     number,
    cumulativePoints: number,
    rankAtTime:       number,
    timestamp:        Date,
  }],
}
```

### 4.4 Match

```typescript
{
  apiMatchId: string,        // from api-football.com, unique
  stage: 'group' | 'round_of_16' | 'quarter_final' | 'semi_final' | 'third_place' | 'final',
  group?: string,            // 'A'–'H'
  homeTeam: { apiId, name, shortName, logo, flag },
  awayTeam: { apiId, name, shortName, logo, flag },
  kickoffAt: Date,
  lockAt:    Date,           // kickoffAt - 15 minutes
  status: 'scheduled' | 'locked' | 'live' | 'finished' | 'postponed',
  result?: {
    homeScore: number,
    awayScore: number,
    winner:    string | null,   // apiTeamId or null for draw
    isAfterExtraTime: boolean,
    isAfterPenalties: boolean,
    penaltyWinner?: string,     // apiTeamId
  },
  scoringCalculatedAt?: Date,
}
```

### 4.5 Prediction

```typescript
{
  userId:    ObjectId,
  matchId:   ObjectId,
  leagueId:  ObjectId,
  homeScore: number,
  awayScore: number,
  isLocked:  boolean,
  pointsEarned?: number,
  breakdown?: {
    exactScore:            boolean,
    correctResult:         boolean,
    correctTeamAdvancing:  boolean,
  },
}
// Unique index: (userId, matchId, leagueId)
```

### 4.6 BonusPrediction

```typescript
{
  userId:         ObjectId,
  leagueId:       ObjectId,
  type:           'tournament_winner' | 'top_scorer' | 'top_assist' | 'custom',
  customBonusId?: string,    // matches league.scoringConfig.bonuses.custom._id
  value:          string,    // team/player apiId or free text
  valueLabel:     string,    // display name
  isLocked:       boolean,   // locked when tournament starts
  pointsEarned?:  number,
}
```

### 4.7 ChatMessage

```typescript
{
  userId:          ObjectId,
  leagueId:        ObjectId,
  conversationId?: ObjectId,    // optional; fallback to userId+leagueId scope
  role:            'user' | 'assistant',
  content:         string,
}
```

### 4.8 Conversation

```typescript
{
  userId:       ObjectId,
  leagueId:     ObjectId,
  title:        string,    // default: 'New conversation'
  messageCount: number,
}
```

### 4.9 Memory

```typescript
{
  userId:    ObjectId,
  leagueId?: ObjectId,    // optional — league-specific memories
  content:   string,      // max 500 chars
  category:  'preferences' | 'league-notes' | 'player-observations' | 'strategy' | 'personal',
  source:    'auto' | 'manual',
}
```

### 4.10 Skill

```typescript
{
  userId:      ObjectId,
  name:        string,    // max 50 chars
  description: string,
  type:        'instruction' | 'tool',
  // instruction → appended to agent system prompt
  // tool → dynamically creates a callable LangChain tool
  prompt:      string,    // max 4000 chars; use {query} placeholder for tool type
  enabled:     boolean,
  tags:        string[],
  icon:        string,    // emoji, default '⚡'
}
```

### 4.11 MCPConfig

```typescript
{
  userId:       ObjectId,
  name:         string,
  url:          string,    // must expose GET /tools/list + POST /tools/call
  headers:      [{ key: string, value: string }],
  description:  string,
  enabled:      boolean,
  toolCount:    number,    // updated on test
  lastTestedAt: Date | null,
}
```

---

## 5. API Routes

All routes live in `apps/web/app/api/`. Protected by NextAuth session unless marked **internal**.

### 5.1 Authentication
| Method | Path | Notes |
|--------|------|-------|
| ANY | `/api/auth/[...nextauth]` | NextAuth handler (Google OAuth, magic link) |

### 5.2 User
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/users/me` | Current user profile |
| PATCH | `/api/users/me` | Update name / timezone / aiApiKey |
| GET | `/api/users/me/memories` | List memories (`?category=` `?leagueId=`) |
| POST | `/api/users/me/memories` | Create manual memory |
| PATCH | `/api/users/me/memories/[id]` | Update memory |
| DELETE | `/api/users/me/memories/[id]` | Delete memory |

### 5.3 Leagues
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/leagues` | 🔒 | List user's leagues |
| POST | `/api/leagues` | 🔒 | Create league |
| GET | `/api/leagues/[id]` | 🔒 | League detail + scoring config |
| PATCH | `/api/leagues/[id]` | 👑 | Update name / avatar / description |
| DELETE | `/api/leagues/[id]` | 👑 | Delete league |
| GET | `/api/leagues/[id]/members` | 🔒 | Member list with points/rank |
| GET | `/api/leagues/[id]/leaderboard` | 🔒 | Current standings |
| GET | `/api/leagues/[id]/leaderboard/history` | 🔒 | Points/rank over time |
| POST | `/api/leagues/[id]/invites` | 👑 | Generate invite token (7d expiry) |
| POST | `/api/leagues/join/[token]` | 🔒 | Join via invite token |
| PATCH | `/api/leagues/[id]/scoring-config` | 👑 | Update scoring config |
| GET | `/api/leagues/[id]/rules` | 🔒 | Auto-generated rules text |
| GET | `/api/leagues/[id]/stats` | 🔒 | Aggregate stats |
| GET | `/api/leagues/[id]/trends` | 🔒 | Points progression chart data |
| GET | `/api/leagues/[id]/mention-search` | 🔒 | Search members + matches by `?q=` |

> 🔒 = authenticated user  ·  👑 = league owner only

### 5.4 Predictions
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/predictions` | User's predictions (`?leagueId=` `?matchId=`) |
| POST | `/api/predictions` | Submit / update prediction (400 if match locked) |

### 5.5 Bonus Predictions
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/leagues/[id]/bonus-predictions` | All bonus predictions |
| POST | `/api/leagues/[id]/bonus-predictions` | Submit bonus prediction |

### 5.6 Matches
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/matches` | All matches with prediction status |
| GET | `/api/matches/upcoming` | Next 48h matches |

### 5.7 Cup
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/leagues/[id]/cup` | Full cup bracket |
| POST | `/api/leagues/[id]/cup/draw` | Initialize cup (owner, once) |
| POST | `/api/leagues/[id]/cup/advance` | Manual advance trigger (owner) |

### 5.8 Chat & Conversations
| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/chat` | Send message → agent (SSE stream) |
| GET | `/api/chat/history` | History (`?leagueId=` `?conversationId=`) |
| GET | `/api/chat/conversations` | List conversations (`?leagueId=`) |
| POST | `/api/chat/conversations` | Create conversation |
| PATCH | `/api/chat/conversations/[id]` | Rename |
| DELETE | `/api/chat/conversations/[id]` | Delete + cascade messages |
| POST | `/api/chat/conversations/[id]/auto-title` | Generate title from first exchange |

### 5.9 Skills & MCP
| Method | Path | Notes |
|--------|------|-------|
| GET/POST | `/api/skills` | List / create |
| PATCH/DELETE | `/api/skills/[id]` | Update / delete |
| PATCH | `/api/skills/[id]/toggle` | Enable / disable |
| GET/POST | `/api/mcp-configs` | List / create |
| PATCH/DELETE | `/api/mcp-configs/[id]` | Update / delete |
| POST | `/api/mcp-configs/[id]/test` | Test connection → `{ ok, tools[] }` |

### 5.10 Cron Jobs (⚙️ CRON_SECRET header required)
| Method | Path | Schedule | Notes |
|--------|------|----------|-------|
| POST | `/api/cron/sync-matches` | Every 5 min | Pull fixtures from api-football.com |
| POST | `/api/cron/lock-predictions` | Every 1 min | Lock predictions past lockAt |
| POST | `/api/cron/calculate-scores` | Every 2 min | Score finished matches |
| POST | `/api/cron/cup-advance` | Every 30 min | Advance cup if stage complete |

### 5.11 Internal Routes (🔑 INTERNAL_API_KEY Bearer token required)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/internal/agent-config` | Returns `{ skills[], mcp_configs[], memories[] }` for a userId |
| GET/POST | `/api/internal/memories` | Read / write user memories |

### 5.12 Agent Sandbox
| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/agent/sandbox` | Stream agent response with provided agentConfig (no DB persistence) |

---

## 6. AI Agent Architecture

### 6.1 Request Flow

```
Frontend POST /api/chat
    → Next.js proxies to FastAPI POST /chat
    → Fetch agent config (skills, MCPs, memories) from /api/internal/agent-config
    → Build dynamic tools (skill tools + MCP tools)
    → Get or compile LangGraph graph for this tool set (hash-keyed cache)
    → Load conversation history from MongoDB
    → Inject memories + custom instructions into system prompt
    → Run astream_events() → stream SSE tokens + tool events back to browser
```

### 6.2 LangGraph Graph

```
[agent_node] ──(has tool calls)──► [tool_node] ──► [agent_node] ──► …
      └──(no tool calls)──────────────────────────────────────► [END]
```

- **`agent_node`** — calls Claude with bound tools, returns tool calls or final text
- **`tool_node`** — executes tool calls using LangChain `ToolNode`
- **Cycle** repeats until agent returns a final message with no tool calls

**Graph caching:** `get_compiled_graph(extra_tools)` uses MD5 hash of sorted tool names as cache key. Identical tool sets share one compiled graph; new combinations compile a fresh one (fast, just topology).

### 6.3 State

```python
class AgentState(TypedDict):
    messages:        list[BaseMessage]   # full conversation (add_messages reducer)
    user_id:         str
    league_id:       str
    conversation_id: str                 # empty = legacy userId+leagueId scope
    ai_api_key:      str                 # user's own key, or falls back to env
    agent_config:    dict                # { skills[], mcp_configs[], memories[] }
```

### 6.4 System Prompt Injection

The system prompt template (`apps/agent/prompts/system.txt`) has two dynamic blocks:

```
{memories}           → "## What I know about you\n- [category] content\n..."
{custom_instructions} → "## Custom Instructions\n- prompt1\n- prompt2\n..."
```

- `memories` come from the user's Memory documents (top 10, loaded via internal API)
- `custom_instructions` come from enabled `instruction`-type Skills

### 6.5 Built-in Tools

| Tool | What it does |
|------|-------------|
| `get_league_table` | Current standings for a league |
| `get_league_members` | Member list |
| `get_league_stats` | Aggregate statistics |
| `get_league_trends` | Points/rank history |
| `get_league_context` | Full rules & scoring config |
| `get_upcoming_matches` | Next matches with lock deadlines |
| `get_match_stats` | Prediction distribution for a match |
| `get_all_matches` | Full fixture list |
| `get_user_predictions` | A user's predictions |
| `get_user_stats` | A user's performance stats |
| `get_match_distribution` | How league members predicted a match |
| `submit_prediction` | Submit/update a prediction (confirms first) |
| `search_web` | Tavily web search (team news, injuries, form) |
| `save_memory` | Silently persist a user observation |

### 6.6 Dynamic Tool Types

**Skill tools (`type: 'tool'`):**  
Creates a `StructuredTool` that calls a one-shot Claude LLM with the skill's `prompt`. Supports `{query}` placeholder substitution.

**MCP tools:**  
`GET {url}/tools/list` returns tool schemas → each becomes a `StructuredTool` that calls `POST {url}/tools/call` with the arguments.

### 6.7 Sandbox Mode

`POST /chat/sandbox` — same as `/chat` except:
- `agent_config` is taken from the **request body** (not loaded from DB)
- Nothing is persisted (no history, no memory saves)
- Used by the Agent Experience → Sandbox tab

---

## 7. Cron Jobs

### 7.1 `sync-matches` — Fixture Sync

Pulls all World Cup 2026 fixtures from api-football.com and upserts them into MongoDB.

```
GET https://v3.football.api-sports.io/fixtures?league=1&season=2026
→ For each fixture:
   - Extract stage, teams, kickoff, result (if finished)
   - Set lockAt = kickoffAt - 15 min
   - MatchModel.findOneAndUpdate({ apiMatchId }, ..., { upsert: true })
```

Frequency: every 5 min (via Vercel Cron in `vercel.json`).

### 7.2 `lock-predictions` — Prediction Locking

```
1. Find matches where lockAt ≤ now AND status ∈ ['scheduled']
2. Bulk update: Prediction.updateMany({ matchId, isLocked: false }, { isLocked: true })
3. Match.updateOne({ _id }, { status: 'locked' })
4. Redis PUBLISH channel:match:{matchId}:lock → Socket.io broadcasts to UI
```

Frequency: every 1 min.

### 7.3 `calculate-scores` — Post-Match Scoring

```
1. Find finished matches without scoringCalculatedAt
2. For each match:
   a. Load all predictions where matchId = X AND isLocked = true
   b. For each prediction → calculatePredictionPoints(...)
   c. Update Prediction: { pointsEarned, breakdown }
   d. Update Membership: totalPoints += points, pointsHistory.push(...)
3. Recalculate ranks for all affected leagues
4. Rebuild Redis sorted set: leaderboard:{leagueId}
5. Redis PUBLISH channel:league:{leagueId}:leaderboard
6. Set match.scoringCalculatedAt = now
```

Frequency: every 2 min.

### 7.4 `cup-advance` — Cup Bracket Progression

See Section 3.5 for detailed flow.

Frequency: every 30 min.

---

## 8. Real-Time Architecture

### 8.1 Overview

```
Cron job (Next.js)
    └── Redis PUBLISH channel:league:{id}:leaderboard  {...}
                                │
                         Redis subscriber
                         (Express process)
                                │
                    io.to('league:{id}').emit('leaderboard:update', {...})
                                │
                    Connected browser clients
                    (useLeaderboard hook re-fetches standings)
```

### 8.2 Channel Pattern Reference

| Redis Channel | Socket.io Event | Payload | Trigger |
|--------------|----------------|---------|---------|
| `channel:league:{id}:leaderboard` | `leaderboard:update` | `{ leagueId, matchId }` | After scoring calc |
| `channel:match:{id}:score` | `match:score` | Live match data | During live match |
| `channel:match:{id}:lock` | `match:locked` | `{ matchId, lockedAt }` | Prediction lock cron |

### 8.3 Socket Room Membership

Clients join rooms on page load:

```typescript
socket.emit('join:league', leagueId)   // on any league page
socket.emit('join:match', matchId)     // on match detail page
```

Express server manages rooms and relay. Clients leave rooms on component unmount.

---

## 9. Frontend Pages

All under `apps/web/app/(dashboard)/`:

| Route | Page | Notes |
|-------|------|-------|
| `/leagues` | League list | All leagues user belongs to |
| `/leagues/new` | Create league | Name, avatar, scoring config setup |
| `/leagues/[slug]` | League hub | Upcoming matches, latest scores |
| `/leagues/[slug]/leaderboard` | Standings | Live-updating table, rank history |
| `/leagues/[slug]/predictions` | Predictions grid | All 64 matches, input scores |
| `/leagues/[slug]/bonus` | Bonus predictions | Tournament winner, top scorer, etc. |
| `/leagues/[slug]/cup` | Cup bracket | Visual bracket tree |
| `/leagues/[slug]/stats` | Analytics | Per-user & per-match breakdowns |
| `/leagues/[slug]/rules` | Rules | Auto-generated from scoringConfig |
| `/leagues/[slug]/settings` | Settings | Owner-only config |
| `/leagues/[slug]/agent` | AI agent page | Skills, MCP servers, Sandbox |
| `/profile` | User profile | Avatar, timezone, memories |

**Persistent chat panel** appears on all `/leagues/[slug]/*` pages (right sidebar, draggable width).

---

## 10. Environment Variables

```bash
# ── Auth ──────────────────────────────────────────────────────
AUTH_SECRET=          # openssl rand -base64 32
NEXTAUTH_URL=         # e.g. http://localhost:3000

# ── OAuth ─────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ── Database ──────────────────────────────────────────────────
MONGODB_URI=          # mongodb://localhost:27017/worldcup26
REDIS_URL=            # redis://localhost:6379

# ── Email (magic link) ────────────────────────────────────────
RESEND_API_KEY=
EMAIL_FROM=           # noreply@yourdomain.com

# ── Football Data ─────────────────────────────────────────────
API_FOOTBALL_KEY=     # from api-football.com
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io

# ── AI ────────────────────────────────────────────────────────
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=      # claude-haiku-4-5-20251001

# ── Web Search (agent) ────────────────────────────────────────
TAVILY_API_KEY=

# ── Internal Services ─────────────────────────────────────────
CRON_SECRET=          # protects /api/cron/* routes
INTERNAL_API_KEY=     # agent ↔ Next.js internal calls
RAILWAY_AGENT_URL=    # http://localhost:8000 in dev
RAILWAY_EXPRESS_URL=  # http://localhost:4000 in dev

# ── LangSmith Tracing (optional) ──────────────────────────────
LANGCHAIN_API_KEY=
LANGCHAIN_TRACING_V2= # true to enable
LANGCHAIN_PROJECT=    # worldcup26
```

---

## 11. Development Setup

### Prerequisites

- Node.js ≥ 18, pnpm ≥ 8
- Python ≥ 3.9
- Docker + Docker Compose (for Mongo/Redis)

### Quick Start

```bash
# 1. Clone & install
git clone <repo>
pnpm install

# 2. Environment
cp .env.example .env.local
# Fill in required keys (at minimum: AUTH_SECRET, MONGODB_URI, ANTHROPIC_API_KEY)

# 3. Start infra (MongoDB + Redis)
docker compose up mongo redis -d

# 4. Start all services (recommended: Docker Compose)
docker compose up

# OR run individually:
# Next.js
pnpm dev

# Express (real-time)
cd apps/api && pnpm dev

# FastAPI agent
cd apps/agent && uvicorn main:app --reload --port 8000
```

### Useful Commands

```bash
# TypeScript type-check
cd apps/web && npx tsc --noEmit

# Seed World Cup 2026 fixtures (needs API_FOOTBALL_KEY)
curl -X POST http://localhost:3000/api/admin/seed-fixtures \
  -H "Authorization: Bearer $INTERNAL_API_KEY"

# Seed mock data (no external API needed)
curl -X POST http://localhost:3000/api/admin/seed-mock \
  -H "Authorization: Bearer $INTERNAL_API_KEY"

# Test internal agent-config endpoint
curl "http://localhost:3000/api/internal/agent-config?userId=<objectId>" \
  -H "Authorization: Bearer $INTERNAL_API_KEY"

# Agent health
curl http://localhost:8000/health
```

---

## 12. Data Flow Walkthroughs

### 12.1 User Submits a Prediction

```
Browser → POST /api/predictions { matchId, leagueId, homeScore, awayScore }
  ↓
API: auth check + match not locked check + rate limit (10/min)
  ↓
PredictionModel.findOneAndUpdate({ userId, matchId, leagueId }, { homeScore, awayScore }, { upsert: true })
  ↓
Response 201 { ok: true, data: prediction }
  ↓
UI: optimistic update shows saved state
```

### 12.2 Match Finishes → Scores Calculated → Leaderboard Updates

```
api-football.com API
  ↓  (every 5 min)
GET /api/cron/sync-matches
  → Match.result populated, status = 'finished'

  ↓  (every 2 min)
GET /api/cron/calculate-scores
  → For each locked prediction on this match:
       points = calculatePredictionPoints(pred, result, stage, config)
       Prediction.pointsEarned = points
       Prediction.breakdown = { exactScore, correctResult, correctTeamAdvancing }
       Membership.totalPoints += points
       Membership.pointsHistory.push(...)
  → Recalculate & write ranks
  → Redis ZADD leaderboard:{leagueId} score userId
  → Redis PUBLISH channel:league:{leagueId}:leaderboard { matchId }

  ↓  (Redis subscriber in Express)
io.to('league:{leagueId}').emit('leaderboard:update', { leagueId, matchId })

  ↓  (browser)
useLeaderboard hook refetches GET /api/leagues/{id}/leaderboard
  → Leaderboard table updates with animation
```

### 12.3 Cup Bracket Advances

```
After all WC Quarter-Finals finish and scores are calculated:

GET /api/cron/cup-advance
  → Find active brackets where current round = quarter_final
  → Check: all QF matches have scoringCalculatedAt set? → Yes
  → For each QF matchup (e.g., Alice vs Bob):
       Alice.points = sum(pointsEarned on 4 QF predictions)
       Bob.points   = sum(pointsEarned on 4 QF predictions)
       → Alice 12 pts, Bob 9 pts → Alice advances
  → Build Semi-Final matchups: [Alice vs Carol, Dave vs Eve, ...]
  → bracket.rounds.push({ roundName: 'Semi Finals', worldCupStage: 'semi_final', matchups: [...] })
  → CupBracket.save()

UI: /leagues/{id}/cup re-fetches bracket → BracketTree re-renders
```

### 12.4 AI Chat Message

```
User types "@Alice how are you doing compared to me?"

Browser
  → ChatInput detects @Alice mention, fetches member via /api/leagues/{id}/mention-search
  → User selects Alice → mention stored with { type: 'user', id: aliceId }
  → POST /api/chat { message, leagueId, conversationId, mentions: [alice] }

Next.js /api/chat
  → Appends mention context to message:
     "[Mentioned context]\n@Alice → user_id: {aliceId} (Rank #3, 42 pts)"
  → POST agent:8000/chat { user_id, league_id, message: enriched, conversation_id }

FastAPI /chat
  → Load agent_config: fetch /api/internal/agent-config → { skills[], memories[], ... }
  → Build dynamic tools
  → Load conversation history from MongoDB
  → Inject memories + instruction skills into system prompt
  → LangGraph runs:
       agent_node → decides to call get_user_stats(aliceId) and get_user_stats(myId)
       tool_node  → executes both
       agent_node → synthesises comparison → streams response
  → SSE: token events → browser assembles response
  → SSE: done → ChatWindow marks streaming complete
  → Auto-title triggered (POST /api/chat/conversations/{id}/auto-title)
```

---

## Areas for Improvement

Here are some natural extension points if you're thinking about what to change or add:

| Area | Current State | Potential Improvement |
|------|-------------|----------------------|
| **Scoring** | Hard-coded exactScore/correctResult duality | Add bonus multipliers (e.g., underdog bonus, streak bonus) |
| **Cup seeding** | Top N by current total points | Seed by last-N-match form instead of total |
| **Predictions lock** | Fixed 15 min before kickoff | Make lock offset configurable per league |
| **Bonus predictions** | Manual resolution | Auto-resolve from api-football.com top scorers |
| **Cup tiebreaker** | Goals predicted → random | Add head-to-head record from earlier cup rounds |
| **Notifications** | None | Push/email on prediction lock warning, leaderboard change |
| **Mobile** | Responsive but not native | React Native wrapper or PWA with offline prediction caching |
| **League discovery** | Invite-only | Public leagues with join requests |
| **Analytics** | Basic stats page | ML-powered prediction quality score, "accuracy over time" |
| **Multi-tournament** | World Cup 2026 hardcoded | Abstract tournament layer to support Euro 2028, Copa, etc. |
