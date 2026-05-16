import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, LeagueModel, MembershipModel, MatchModel, PredictionModel, UserModel } from '@worldcup26/db'

interface Params { params: { leagueId: string; matchId: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const { user, error } = await getAuthUser()
  if (error) return error

  await connectDB()

  const league = await LeagueModel.findOne({ slug: params.leagueId }).lean() as any
  if (!league) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })

  // Verify membership
  const membership = await MembershipModel.findOne({
    userId: (user as any)._id,
    leagueId: league._id,
  }).lean()
  if (!membership) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

  const match = await MatchModel.findById(params.matchId).lean() as any
  if (!match) return NextResponse.json({ ok: false, error: 'Match not found' }, { status: 404 })

  // Get all member predictions for this match
  const predictions = await PredictionModel.find({
    matchId: match._id,
    leagueId: league._id,
  }).lean() as any[]

  const userIds = predictions.map((p) => p.userId)
  const users = await UserModel.find({ _id: { $in: userIds } }, 'name avatar').lean() as any[]
  const userMap = new Map(users.map((u) => [String(u._id), u]))

  // Leaderboard rank/points for each user
  const memberships = await MembershipModel.find(
    { leagueId: league._id, userId: { $in: userIds } },
    'userId totalPoints rank'
  ).lean() as any[]
  const memberMap = new Map(memberships.map((m) => [String(m.userId), m]))

  // Tally distribution
  let homeWins = 0, draws = 0, awayWins = 0
  const entries = predictions.map((p) => {
    const u = userMap.get(String(p.userId)) ?? {}
    const mb = memberMap.get(String(p.userId)) ?? {}
    const result = p.homeScore > p.awayScore ? 'home'
      : p.awayScore > p.homeScore ? 'away'
      : 'draw'
    if (result === 'home') homeWins++
    else if (result === 'draw') draws++
    else awayWins++
    return {
      userId: String(p.userId),
      name: (u as any).name ?? '?',
      avatar: (u as any).avatar ?? '',
      homeScore: p.homeScore,
      awayScore: p.awayScore,
      pointsEarned: p.pointsEarned,
      isLocked: p.isLocked,
      rank: (mb as any).rank ?? 0,
      totalPoints: (mb as any).totalPoints ?? 0,
      isMe: String(p.userId) === String((user as any)._id),
    }
  }).sort((a, b) => a.rank - b.rank)

  const total = entries.length
  return NextResponse.json({
    ok: true,
    data: {
      match: {
        id: String(match._id),
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        kickoffAt: match.kickoffAt,
        status: match.status,
        result: match.result ?? null,
      },
      distribution: {
        homeWins, draws, awayWins, total,
        homeWinPct: total ? Math.round((homeWins / total) * 100) : 0,
        drawPct: total ? Math.round((draws / total) * 100) : 0,
        awayWinPct: total ? Math.round((awayWins / total) * 100) : 0,
      },
      entries,
    },
  })
}
