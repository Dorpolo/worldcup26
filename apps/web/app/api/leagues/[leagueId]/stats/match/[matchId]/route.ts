import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, MembershipModel, PredictionModel, MatchModel, UserModel } from '@worldcup26/db'

interface Params { params: { leagueId: string; matchId: string } }

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

  const match = await MatchModel.findById(params.matchId).lean() as any
  if (!match) return NextResponse.json({ ok: false, error: 'Match not found' }, { status: 404 })

  const predictions = await PredictionModel.find({
    matchId: params.matchId,
    leagueId: params.leagueId,
  }).lean() as any[]

  const userIds = predictions.map((p) => p.userId)
  const users = await UserModel.find({ _id: { $in: userIds } }).lean() as any[]
  const userMap = new Map(users.map((u) => [String(u._id), u.name as string]))

  // Build score distribution
  const distMap = new Map<string, number>()
  for (const p of predictions) {
    const key = `${p.homeScore}-${p.awayScore}`
    distMap.set(key, (distMap.get(key) ?? 0) + 1)
  }
  const distribution = Array.from(distMap.entries())
    .map(([score, count]) => ({ score, count }))
    .sort((a, b) => b.count - a.count)

  const memberBreakdown = predictions.map((p) => ({
    userId: String(p.userId),
    name: userMap.get(String(p.userId)) ?? 'Unknown',
    homeScore: p.homeScore,
    awayScore: p.awayScore,
    pointsEarned: p.pointsEarned ?? null,
    exactScore: p.breakdown?.exactScore ?? false,
    correctResult: p.breakdown?.correctResult ?? false,
    correctTeamAdvancing: p.breakdown?.correctTeamAdvancing ?? false,
  }))

  return NextResponse.json({
    ok: true,
    data: {
      match: {
        id: String(match._id),
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        result: match.result ?? null,
        status: match.status,
        kickoffAt: match.kickoffAt,
      },
      distribution,
      memberBreakdown,
      totals: {
        predicted: predictions.length,
        exact: predictions.filter((p) => p.breakdown?.exactScore).length,
        correctResult: predictions.filter((p) => p.breakdown?.correctResult).length,
        wrong: predictions.filter(
          (p) => p.pointsEarned != null && !p.breakdown?.exactScore && !p.breakdown?.correctResult
        ).length,
      },
    },
  })
}
