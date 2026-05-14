import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

const NEXT_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
const INTERNAL_KEY = process.env.INTERNAL_API_KEY ?? ''

function headers() {
  return {
    'Authorization': `Bearer ${INTERNAL_KEY}`,
    'Content-Type': 'application/json',
  }
}

async function apiGet(path: string, userId: string, extraParams: Record<string, string> = {}) {
  const params = new URLSearchParams({ userId, ...extraParams })
  const res = await fetch(`${NEXT_URL}${path}?${params}`, { headers: headers() })
  return res.json()
}

async function apiPost(path: string, userId: string, body: Record<string, unknown>) {
  const params = new URLSearchParams({ userId })
  const res = await fetch(`${NEXT_URL}${path}?${params}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })
  return res.json()
}

function text(data: unknown): string {
  return JSON.stringify(data, null, 2)
}

export function registerTools(server: McpServer, userId: string) {

  server.tool(
    'get_league_table',
    'Get the current standings for a league with rank, name, and total points for every member.',
    { league_id: z.string().describe('League MongoDB ObjectId') },
    async ({ league_id }) => {
      const data = await apiGet(`/api/leagues/${league_id}/leaderboard`, userId)
      return { content: [{ type: 'text', text: text(data) }] }
    }
  )

  server.tool(
    'get_user_predictions',
    "Get the authenticated user's predictions for a league, optionally filtered by match status.",
    {
      league_id: z.string().describe('League MongoDB ObjectId'),
      match_status: z.enum(['pending', 'locked', 'finished', 'all']).optional().default('all')
        .describe("Filter predictions by status: 'pending' | 'locked' | 'finished' | 'all'"),
    },
    async ({ league_id, match_status }) => {
      const data = await apiGet('/api/predictions', userId, { leagueId: league_id, status: match_status ?? 'all' })
      return { content: [{ type: 'text', text: text(data) }] }
    }
  )

  server.tool(
    'get_upcoming_matches',
    'Get upcoming World Cup matches with kickoff times and prediction lock deadlines.',
    {
      hours_ahead: z.number().int().min(1).max(168).optional().default(48)
        .describe('How many hours ahead to look (default: 48)'),
    },
    async ({ hours_ahead }) => {
      const data = await apiGet('/api/matches/upcoming', userId, { hours: String(hours_ahead ?? 48) })
      return { content: [{ type: 'text', text: text(data) }] }
    }
  )

  server.tool(
    'get_all_matches',
    'Get all World Cup 2026 matches, optionally filtered by stage.',
    {
      stage: z.enum(['group', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final', ''])
        .optional().default('').describe('Filter by tournament stage'),
    },
    async ({ stage }) => {
      const params: Record<string, string> = {}
      if (stage) params.stage = stage
      const data = await apiGet('/api/matches', userId, params)
      return { content: [{ type: 'text', text: text(data) }] }
    }
  )

  server.tool(
    'get_match_stats',
    'Get prediction distribution and scoring breakdown for a finished match in a league.',
    {
      match_id: z.string().describe('Match MongoDB ObjectId'),
      league_id: z.string().describe('League MongoDB ObjectId'),
    },
    async ({ match_id, league_id }) => {
      const data = await apiGet(`/api/leagues/${league_id}/stats/match/${match_id}`, userId)
      return { content: [{ type: 'text', text: text(data) }] }
    }
  )

  server.tool(
    'get_league_trends',
    'Get points progression and rank history over time for all league members.',
    { league_id: z.string().describe('League MongoDB ObjectId') },
    async ({ league_id }) => {
      const data = await apiGet(`/api/leagues/${league_id}/trends`, userId)
      return { content: [{ type: 'text', text: text(data) }] }
    }
  )

  server.tool(
    'get_cup_bracket',
    'Get the full cup competition bracket for a league, including all rounds and matchups.',
    { league_id: z.string().describe('League MongoDB ObjectId') },
    async ({ league_id }) => {
      const data = await apiGet(`/api/leagues/${league_id}/cup`, userId)
      return { content: [{ type: 'text', text: text(data) }] }
    }
  )

  server.tool(
    'get_league_context',
    'Get scoring rules, cup format, and tournament progress for a league. Use when the user asks how scoring works.',
    { league_id: z.string().describe('League MongoDB ObjectId') },
    async ({ league_id }) => {
      const data = await apiGet(`/api/leagues/${league_id}/context`, userId)
      return { content: [{ type: 'text', text: text(data) }] }
    }
  )

  server.tool(
    'submit_prediction',
    'Submit or update a match prediction. Returns an error if the match is locked. Always confirm with the user first.',
    {
      match_id: z.string().describe('Match MongoDB ObjectId'),
      league_id: z.string().describe('League MongoDB ObjectId'),
      home_score: z.number().int().min(0).max(30).describe('Predicted home team score'),
      away_score: z.number().int().min(0).max(30).describe('Predicted away team score'),
    },
    async ({ match_id, league_id, home_score, away_score }) => {
      const data = await apiPost('/api/predictions', userId, {
        matchId: match_id,
        leagueId: league_id,
        homeScore: home_score,
        awayScore: away_score,
      })
      return { content: [{ type: 'text', text: text(data) }] }
    }
  )
}
