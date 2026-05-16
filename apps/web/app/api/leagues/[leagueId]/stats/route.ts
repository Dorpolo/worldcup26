import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, MembershipModel, PredictionModel, MatchModel } from '@worldcup26/db'

interface Params { params: { leagueId: string } }

export async function GET(req: NextRequest, { params }: Params) {
  const { user, error } = await getAuthUser(req)
  if (error) return error

  await connectDB()

  let membership: any = null
  if (!(user as any).isInternal) {
    membership = await MembershipModel.findOne({
      leagueId: params.leagueId,
      userId: (user as any)._id,
    }).lean()
    if (!membership) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  } else {
    membership = { leagueId: params.leagueId }
  }

  // All predictions in this league for finished matches
  const predictions = await PredictionModel.find({
    leagueId: params.leagueId,
    pointsEarned: { $exists: true },
  }).lean()

  // Group by userId
  const byUser = new Map<string, typeof predictions>()
  for (const p of predictions) {
    const uid = String(p.userId)
    if (!byUser.has(uid)) byUser.set(uid, [])
    byUser.get(uid)!.push(p)
  }

  // All finished matches count
  const finishedMatches = await MatchModel.countDocuments({ status: 'finished' })

  // Build per-user stats
  const userStats = Array.from(byUser.entries()).map(([userId, preds]) => {
    const exactScores = preds.filter((p) => p.breakdown?.exactScore).length
    const correctResults = preds.filter((p) => p.breakdown?.correctResult).length
    const totalPoints = preds.reduce((sum, p) => sum + (p.pointsEarned ?? 0), 0)
    const predicted = preds.length
    const scored = preds.filter((p) => (p.pointsEarned ?? 0) > 0).length

    return {
      userId,
      totalPoints,
      predicted,
      exactScores,
      correctResults,
      accuracy: predicted > 0 ? Math.round(((exactScores + correctResults) / predicted) * 100) : 0,
      pointsPerMatch: predicted > 0 ? +(totalPoints / predicted).toFixed(1) : 0,
    }
  })

  // Match-level stats: most popular predictions, hardest matches to predict
  const matchPredictions = await PredictionModel.aggregate([
    { $match: { leagueId: (membership as any).leagueId, pointsEarned: { $exists: true } } },
    {
      $group: {
        _id: '$matchId',
        totalPredictions: { $sum: 1 },
        exactScores: { $sum: { $cond: ['$breakdown.exactScore', 1, 0] } },
        correctResults: { $sum: { $cond: ['$breakdown.correctResult', 1, 0] } },
        avgPoints: { $avg: '$pointsEarned' },
      },
    },
    { $sort: { avgPoints: 1 } },
    { $limit: 5 },
  ])

  return NextResponse.json({
    ok: true,
    data: {
      finishedMatches,
      totalPredictions: predictions.length,
      userStats,
      hardestMatches: matchPredictions,
    },
  })
}
