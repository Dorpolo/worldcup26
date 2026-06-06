import { getRedis } from './redis'

const BASE_URL = process.env.API_FOOTBALL_BASE_URL ?? 'https://v3.football.api-sports.io'
const API_KEY = process.env.API_FOOTBALL_KEY ?? ''

// World Cup 2026: league=1, season=2026
export const WC_LEAGUE_ID = 1
export const WC_SEASON = 2026

async function apiFetch<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString()
  const url = `${BASE_URL}/${endpoint}?${qs}`

  console.log(`[FOOTBALL-API] Fetching ${endpoint}`, { url, apiKey: API_KEY ? 'SET' : 'MISSING' })

  const res = await fetch(url, {
    headers: {
      'x-apisports-key': API_KEY,
    },
    next: { revalidate: 60 }, // Next.js fetch cache: 60s
  })

  console.log(`[FOOTBALL-API] Response status: ${res.status}`)

  if (!res.ok) throw new Error(`API-Football ${endpoint} returned ${res.status}`)
  const json = await res.json()
  console.log(`[FOOTBALL-API] Parsed response, response.length=${(json.response as any[])?.length ?? 'N/A'}`)
  return json.response as T
}

// ─── Cached wrappers ─────────────────────────────────────────────────────────

export async function fetchFixtures(date: string) {
  const r = getRedis()
  const cacheKey = `apifootball:fixtures:${date}`
  const cached = await r.get<unknown[]>(cacheKey)
  if (cached) return cached

  const data = await apiFetch<unknown[]>('fixtures', {
    league: WC_LEAGUE_ID,
    season: WC_SEASON,
    date,
  })

  await r.set(cacheKey, data, { ex: 300 })
  return data
}

export async function fetchLiveFixtures() {
  const r = getRedis()
  const cacheKey = `apifootball:fixtures:live`
  const cached = await r.get<unknown[]>(cacheKey)
  if (cached) return cached

  const data = await apiFetch<unknown[]>('fixtures', {
    league: WC_LEAGUE_ID,
    season: WC_SEASON,
    live: 'all',
  })

  await r.set(cacheKey, data, { ex: 60 }) // 60s for live data
  return data
}

export async function fetchAllFixtures() {
  return apiFetch<unknown[]>('fixtures', {
    league: WC_LEAGUE_ID,
    season: WC_SEASON,
  })
}

export async function fetchTopScorers() {
  const r = getRedis()
  const cacheKey = `apifootball:topscorers:${WC_SEASON}`
  const cached = await r.get<unknown[]>(cacheKey)
  if (cached) return cached

  const data = await apiFetch<unknown[]>('players/topscorers', {
    league: WC_LEAGUE_ID,
    season: WC_SEASON,
  })

  await r.set(cacheKey, data, { ex: 3600 })
  return data
}

// ─── New endpoints for enhanced predictions ────────────────────────────────

export async function fetchStandings() {
  const r = getRedis()
  const cacheKey = `apifootball:standings:${WC_SEASON}`
  const cached = await r.get<unknown>(cacheKey)
  if (cached) return cached

  const data = await apiFetch<unknown>('standings', {
    league: WC_LEAGUE_ID,
    season: WC_SEASON,
  })

  // Cache for 30 minutes as standings update less frequently
  await r.set(cacheKey, data, { ex: 1800 })
  return data
}

export async function fetchTeams() {
  const r = getRedis()
  const cacheKey = `apifootball:teams:${WC_SEASON}`
  const cached = await r.get<unknown[]>(cacheKey)
  if (cached) return cached

  const data = await apiFetch<unknown[]>('teams', {
    league: WC_LEAGUE_ID,
    season: WC_SEASON,
  })

  // Cache for 1 hour
  await r.set(cacheKey, data, { ex: 3600 })
  return data
}

export async function fetchPlayers(teamId: number) {
  const r = getRedis()
  const cacheKey = `apifootball:players:team${teamId}:${WC_SEASON}`
  const cached = await r.get<unknown[]>(cacheKey)
  if (cached) {
    console.log(`[fetchPlayers] Cache HIT for team ${teamId}`)
    return cached
  }

  console.log(`[fetchPlayers] Cache MISS for team ${teamId}, calling API...`)
  const data = await apiFetch<unknown[]>('players', {
    league: WC_LEAGUE_ID,
    season: WC_SEASON,
    team: teamId,
    page: 1,
  })
  console.log(`[fetchPlayers] API returned ${Array.isArray(data) ? data.length : 'non-array'} items for team ${teamId}`)

  // Cache for 6 hours
  await r.set(cacheKey, data, { ex: 21600 })
  return data
}

export async function fetchFixtureDetails(fixtureId: number) {
  const r = getRedis()
  const cacheKey = `apifootball:fixture:${fixtureId}`
  const cached = await r.get<unknown>(cacheKey)
  if (cached) return cached

  const data = await apiFetch<unknown>('fixtures', {
    id: fixtureId,
  })

  // Cache for 30 minutes for finished matches, 5 minutes for live
  const cacheTime = 1800
  await r.set(cacheKey, data, { ex: cacheTime })
  return data
}

export async function fetchLatestMatches(limit = 5) {
  const r = getRedis()
  const cacheKey = `apifootball:latestmatches:${limit}`
  const cached = await r.get<unknown[]>(cacheKey)
  if (cached) return cached

  // Fetch all fixtures and get the latest ones
  const data = await apiFetch<unknown[]>('fixtures', {
    league: WC_LEAGUE_ID,
    season: WC_SEASON,
    status: 'FT', // Finished matches
  })

  // For now, just cache and return raw data
  // Frontend will sort by date
  await r.set(cacheKey, data, { ex: 600 })
  return data
}
