import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, MembershipModel } from '@worldcup26/db'
import { setLeaderboardInCache } from '@/lib/redis'

interface Params { params: { leagueId: string } }

export async function GET(req: NextRequest, { params }: Params) {
  const { user, error } = await getAuthUser(req)
  if (error) return error

  await connectDB()

  if (!(user as any).isInternal) {
    const membership = await MembershipModel.findOne({
      leagueId: params.leagueId,
      userId: (user as any)._id,
    }).lean()
    if (!membership) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  const memberships = await MembershipModel.find({ leagueId: params.leagueId })
    .populate('userId', 'name avatar')
    .sort({ totalPoints: -1 })
    .lean() as any[]

  const currentUserId = String((user as any)._id)

  const leaderboard = memberships.map((m: any, i: number) => ({
    rank: i + 1,
    userId: String(m.userId._id),
    name: m.userId.name,
    avatar: m.userId.avatar,
    totalPoints: m.totalPoints,
    role: m.role,
    isMe: String(m.userId._id) === currentUserId,
  }))

  // Rebuild cache in background (don't await — don't block the response)
  setLeaderboardInCache(
    params.leagueId,
    leaderboard.map((e) => ({ userId: e.userId, points: e.totalPoints }))
  ).catch(() => {})

  return NextResponse.json({ ok: true, data: leaderboard })
}
