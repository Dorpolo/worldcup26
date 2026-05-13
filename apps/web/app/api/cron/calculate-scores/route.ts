import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/auth-helpers'
import { connectDB, MatchModel, PredictionModel, MembershipModel, LeagueModel } from '@worldcup26/db'
import { calculatePredictionPoints } from '@worldcup26/config'
import { setLeaderboardInCache, getRedis } from '@/lib/redis'

export async function POST(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  // Find finished matches not yet scored
  const matches = await MatchModel.find({
    status: 'finished',
    scoringCalculatedAt: { $exists: false },
    result: { $exists: true },
  }).lean()

  let totalPredictionsScored = 0

  for (const match of matches) {
    if (!match.result) continue

    // Get the scoring config from each affected league
    const predictions = await PredictionModel.find({
      matchId: match._id,
      isLocked: true,
      pointsEarned: { $exists: false },
    }).lean()

    // Group by leagueId
    const leagueIds = [...new Set(predictions.map((p) => String(p.leagueId)))]
    const leagues = await LeagueModel.find({ _id: { $in: leagueIds } }).lean()
    const leagueMap = Object.fromEntries(leagues.map((l) => [String(l._id), l]))

    for (const prediction of predictions) {
      const league = leagueMap[String(prediction.leagueId)]
      if (!league) continue

      const { points, breakdown } = calculatePredictionPoints(
        prediction.homeScore,
        prediction.awayScore,
        match.result as any,
        match.stage as any,
        league.scoringConfig as any
      )

      await PredictionModel.findByIdAndUpdate(prediction._id, {
        $set: { pointsEarned: points, breakdown },
      })

      // Update membership total points + history
      await MembershipModel.findOneAndUpdate(
        { userId: prediction.userId, leagueId: prediction.leagueId },
        {
          $inc: { totalPoints: points },
          $push: {
            pointsHistory: {
              matchId: match._id,
              pointsEarned: points,
              cumulativePoints: 0, // updated below after total known
              rankAtTime: 0,
              timestamp: new Date(),
            },
          },
        }
      )

      totalPredictionsScored++
    }

    // Mark match as scored
    await MatchModel.findByIdAndUpdate(match._id, {
      $set: { scoringCalculatedAt: new Date() },
    })

    // Rebuild leaderboard cache for each affected league + publish update event
    const r = getRedis()
    for (const leagueId of leagueIds) {
      const memberships = await MembershipModel.find({ leagueId })
        .sort({ totalPoints: -1 })
        .lean()

      // Update ranks
      for (let i = 0; i < memberships.length; i++) {
        await MembershipModel.findByIdAndUpdate(memberships[i]._id, {
          $set: { rank: i + 1 },
        })
      }

      await setLeaderboardInCache(
        leagueId,
        memberships.map((m) => ({ userId: String(m.userId), points: m.totalPoints }))
      )

      await r.publish(
        `channel:league:${leagueId}:leaderboard`,
        JSON.stringify({ leagueId, matchId: String(match._id), updatedAt: new Date() })
      )
    }
  }

  return NextResponse.json({ ok: true, data: { matchesScored: matches.length, totalPredictionsScored } })
}
