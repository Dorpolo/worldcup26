import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, MembershipModel, MatchModel } from '@worldcup26/db'

interface Params { params: { leagueId: string } }

export async function GET(req: NextRequest, { params }: Params) {
  const { user, error } = await getAuthUser(req)
  if (error) return error

  const q = new URL(req.url).searchParams.get('q')?.toLowerCase().trim() ?? ''

  await connectDB()

  // Verify membership
  if (!(user as any).isInternal) {
    const m = await MembershipModel.findOne({
      leagueId: params.leagueId,
      userId: (user as any)._id,
    }).lean()
    if (!m) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  // Members: name search, return top 6
  const memberDocs = await MembershipModel.find({ leagueId: params.leagueId })
    .populate('userId', 'name avatar')
    .sort({ totalPoints: -1 })
    .lean() as any[]

  const allMembers = memberDocs.map((m: any, i: number) => ({
    type: 'user' as const,
    id: String(m.userId._id),
    label: m.userId.name,
    icon: m.userId.avatar || undefined,
    meta: {
      rank: i + 1,
      points: m.totalPoints,
      avatar: m.userId.avatar,
    },
  }))

  const members = q
    ? allMembers.filter((m) => m.label.toLowerCase().includes(q))
    : allMembers.slice(0, 6)

  // Matches: team name search, return top 8
  const matchQuery = q
    ? {
        $or: [
          { 'homeTeam.name': { $regex: q, $options: 'i' } },
          { 'awayTeam.name': { $regex: q, $options: 'i' } },
          { 'homeTeam.shortName': { $regex: q, $options: 'i' } },
          { 'awayTeam.shortName': { $regex: q, $options: 'i' } },
          { group: { $regex: q, $options: 'i' } },
          { stage: { $regex: q, $options: 'i' } },
        ],
      }
    : {}

  const matchDocs = await MatchModel.find(matchQuery)
    .sort({ kickoffAt: 1 })
    .limit(8)
    .lean()

  const matches = matchDocs.map((m: any) => ({
    type: 'match' as const,
    id: String(m._id),
    label: `${m.homeTeam.shortName ?? m.homeTeam.name} vs ${m.awayTeam.shortName ?? m.awayTeam.name}`,
    meta: {
      homeTeam: m.homeTeam.name,
      awayTeam: m.awayTeam.name,
      homeFlag: m.homeTeam.flag,
      awayFlag: m.awayTeam.flag,
      kickoffAt: m.kickoffAt,
      status: m.status,
      stage: m.stage,
      group: m.group,
    },
  }))

  return NextResponse.json({ ok: true, data: { members, matches } })
}
