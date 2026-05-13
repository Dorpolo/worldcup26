import { Redis } from '@upstash/redis'

// Singleton — safe for Next.js serverless functions
let redis: Redis | null = null

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return redis
}

// ─── Leaderboard helpers ─────────────────────────────────────────────────────

export async function getLeaderboardFromCache(leagueId: string) {
  const r = getRedis()
  return r.zrange<string[]>(`leaderboard:${leagueId}`, 0, -1, { rev: true, withScores: true })
}

export async function setLeaderboardInCache(
  leagueId: string,
  entries: Array<{ userId: string; points: number }>
) {
  const r = getRedis()
  const pipeline = r.pipeline()
  pipeline.del(`leaderboard:${leagueId}`)
  for (const entry of entries) {
    pipeline.zadd(`leaderboard:${leagueId}`, { score: entry.points, member: entry.userId })
  }
  pipeline.expire(`leaderboard:${leagueId}`, 300) // 5 min TTL
  return pipeline.exec()
}

// ─── Invite token helpers ─────────────────────────────────────────────────────

export async function cacheInviteToken(token: string, leagueId: string, expiresAt: Date) {
  const r = getRedis()
  const ttl = Math.floor((expiresAt.getTime() - Date.now()) / 1000)
  return r.setex(`invite:${token}`, ttl, leagueId)
}

export async function getInviteLeagueId(token: string): Promise<string | null> {
  const r = getRedis()
  return r.get(`invite:${token}`)
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

export async function checkRateLimit(
  userId: string,
  action: string,
  maxRequests = 10,
  windowSecs = 60
): Promise<boolean> {
  const r = getRedis()
  const key = `ratelimit:${action}:${userId}`
  const current = await r.incr(key)
  if (current === 1) await r.expire(key, windowSecs)
  return current <= maxRequests
}
