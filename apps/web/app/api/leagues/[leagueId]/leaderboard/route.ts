import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, MembershipModel } from '@worldcup26/db'
import { getLeaderboardFromCache, setLeaderboardInCache } from '@/lib/redis'

interface Params {
  params: { leagueId: string }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { user, error } = await getAuthUser()
  if (error) return error

  await connectDB()

  // Try Redis cache first
  const cached = await getLeaderboardFromCache(params.leagueId)
  if (cached && cached.length > 0) {
    // Redis returns [member, score, member, score, ...] with withScores
    // Reconstruct leaderboard entries from cache
    const entries: Array<{ userId: string; points: number }> = []
    for (let i = 0; i < cached.length; i += 2) {
      entries.push({ userId: cached[i] as string, points: Number(cached[i + 1]) })
    }
    return NextResponse.json({ ok: true, data: entries, source: 'cache' })
  }

  // Fallback to DB
  const memberships = await MembershipModel.find({ leagueId: params.leagueId })
    .populate('userId', 'name avatar')
    .sort({ totalPoints: -1 })
    .lean()

  const leaderboard = memberships.map((m, i) => {
    const member = m.userId as any
    return {
      rank: i + 1,
      userId: String(member._id),
      name: member.name,
      avatar: member.avatar,
      totalPoints: m.totalPoints,
    }
  })

  // Rebuild cache
  await setLeaderboardInCache(
    params.leagueId,
    leaderboard.map((e) => ({ userId: e.userId, points: e.totalPoints }))
  )

  return NextResponse.json({ ok: true, data: leaderboard, source: 'db' })
}
