import { getRedis } from './redis'

const POLLY_MARKET_BASE_URL = process.env.POLLY_MARKET_BASE_URL ?? 'https://api.polymarket.com'
const POLLY_MARKET_API_KEY = process.env.POLLY_MARKET_API_KEY ?? ''

// Cache time for market data: 5 minutes for live probabilities
const MARKET_DATA_CACHE_TTL = 300

export interface MarketProbabilities {
  homeWinProb: number      // 0-100
  drawProb: number         // 0-100
  awayWinProb: number      // 0-100
  marketVolume: number     // In USD
  lastUpdated: Date
  odds?: {
    homeWin: number
    draw: number
    awayWin: number
  }
  url?: string             // Direct link to market
}

/**
 * Fetch market probabilities for a match from Polly Market.
 * Returns cached result if available.
 */
export async function fetchMarketProbabilities(
  homeTeam: string,
  awayTeam: string,
  matchDate: string
): Promise<MarketProbabilities | null> {
  try {
    const r = getRedis()
    const cacheKey = `pollymarket:${homeTeam}:${awayTeam}:${matchDate}`
    const cached = await r.get<MarketProbabilities>(cacheKey)
    if (cached) return cached

    // Query Polly Market API for this match
    // Search for market matching home vs away
    const query = encodeURIComponent(`${homeTeam} vs ${awayTeam}`)
    const searchUrl = `${POLLY_MARKET_BASE_URL}/markets?search=${query}`

    const searchRes = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${POLLY_MARKET_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!searchRes.ok) {
      console.warn(`Polly Market search failed: ${searchRes.status}`)
      return null
    }

    const searchData = await searchRes.json() as any
    const markets = searchData.data?.markets ?? []

    if (markets.length === 0) {
      // No market found for this match
      console.warn(`No Polly Market found for ${homeTeam} vs ${awayTeam}`)
      return null
    }

    // Use the first matching market
    const market = markets[0]
    const marketId = market.id

    // Fetch detailed market data including probabilities
    const marketUrl = `${POLLY_MARKET_BASE_URL}/markets/${marketId}`
    const marketRes = await fetch(marketUrl, {
      headers: {
        'Authorization': `Bearer ${POLLY_MARKET_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!marketRes.ok) {
      console.warn(`Polly Market fetch failed: ${marketRes.status}`)
      return null
    }

    const marketData = await marketRes.json() as any
    const probs = marketData.data?.probabilities

    // Parse probabilities (assume array of outcomes: [home, draw, away])
    const result: MarketProbabilities = {
      homeWinProb: Math.round((probs?.[0] ?? 0) * 100),
      drawProb: Math.round((probs?.[1] ?? 0) * 100),
      awayWinProb: Math.round((probs?.[2] ?? 0) * 100),
      marketVolume: marketData.data?.volume ?? 0,
      lastUpdated: new Date(),
      url: marketData.data?.url ?? `https://polymarket.com/market/${marketId}`,
    }

    // Cache for 5 minutes
    await r.set(cacheKey, result, { ex: MARKET_DATA_CACHE_TTL })
    return result
  } catch (err) {
    console.error('Failed to fetch market probabilities:', err)
    return null
  }
}

/**
 * Get direct URL to Polly Market for a match.
 * Useful when we can't fetch probabilities but want to link to the market.
 */
export function getPollyMarketUrl(homeTeam: string, awayTeam: string): string {
  const query = encodeURIComponent(`${homeTeam} vs ${awayTeam}`)
  return `https://polymarket.com/search?query=${query}`
}

/**
 * Batch fetch market probabilities for multiple matches.
 */
export async function fetchMarketProbabilitiesBatch(
  matches: Array<{ homeTeam: string; awayTeam: string; date: string }>
): Promise<Record<string, MarketProbabilities | null>> {
  const results: Record<string, MarketProbabilities | null> = {}

  for (const match of matches) {
    const key = `${match.homeTeam}-${match.awayTeam}`
    results[key] = await fetchMarketProbabilities(match.homeTeam, match.awayTeam, match.date)
  }

  return results
}
