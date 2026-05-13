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

  const res = await fetch(url, {
    headers: {
      'x-apisports-key': API_KEY,
    },
    next: { revalidate: 60 }, // Next.js fetch cache: 60s
  })

  if (!res.ok) throw new Error(`API-Football ${endpoint} returned ${res.status}`)
  const json = await res.json()
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

  await r.setex(cacheKey, 300, data)
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

  await r.setex(cacheKey, 60, data) // 60s for live data
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

  await r.setex(cacheKey, 3600, data)
  return data
}
