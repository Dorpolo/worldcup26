import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, MembershipModel, UserModel } from '@worldcup26/db'

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
    .sort({ totalPoints: -1 })
    .lean()

  const userIds = memberships.map((m) => m.userId)
  const users = await UserModel.find({ _id: { $in: userIds } }).lean() as any[]
  const userMap = new Map(users.map((u) => [String(u._id), { name: u.name, avatar: u.avatar }]))

  const data = memberships.map((m) => ({
    userId: String(m.userId),
    name: userMap.get(String(m.userId))?.name ?? 'Unknown',
    avatar: userMap.get(String(m.userId))?.avatar,
    totalPoints: m.totalPoints,
    rank: m.rank ?? 0,
    pointsHistory: (m.pointsHistory ?? []).map((h: any) => ({
      matchId: String(h.matchId),
      pointsEarned: h.pointsEarned,
      cumulativePoints: h.cumulativePoints,
      rankAtTime: h.rankAtTime,
      timestamp: h.timestamp,
    })),
  }))

  return NextResponse.json({ ok: true, data })
}
