import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'
import {
  connectDB,
  MatchModel,
  PredictionModel,
  CupBracketModel,
  UserModel,
  MembershipModel,
} from '@worldcup26/db'
import { resolveMatchup, nextCupStage, buildNextRoundMatchups } from '@/lib/cup-advance'
import type { MatchStage } from '@worldcup26/types'

interface Params { params: { leagueId: string } }

const ROUND_NAMES: Record<string, string> = {
  round_of_16: 'Round of 16',
  quarter_final: 'Quarter Finals',
  semi_final: 'Semi Finals',
  final: 'Final',
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { user, error } = await getAuthUser()
  if (error) return error

  await connectDB()

  // Owner only
  const membership = await MembershipModel.findOne({
    leagueId: params.leagueId,
    userId: (user as any)._id,
    role: 'owner',
  }).lean()
  if (!membership) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

  const bracket = await CupBracketModel.findOne({ leagueId: params.leagueId }).lean() as any
  if (!bracket) return NextResponse.json({ ok: false, error: 'No cup bracket found' }, { status: 404 })
  if (bracket.status === 'completed') {
    return NextResponse.json({ ok: false, error: 'Cup already completed' }, { status: 409 })
  }

  const currentRound = (bracket.rounds as any[]).find((r: any) => r.status === 'active')
  if (!currentRound) {
    return NextResponse.json({ ok: false, error: 'No active round' }, { status: 400 })
  }

  const worldCupStage = currentRound.worldCupStage as MatchStage

  // Check stage is fully scored
  const total = await MatchModel.countDocuments({ stage: worldCupStage })
  const scored = await MatchModel.countDocuments({
    stage: worldCupStage,
    status: 'finished',
    scoringCalculatedAt: { $exists: true },
  })

  if (total > 0 && scored < total) {
    return NextResponse.json(
      { ok: false, error: `${scored}/${total} matches in ${worldCupStage} have been scored. Wait for all to finish.` },
      { status: 400 }
    )
  }

  // Sum points per user for this stage
  const stageMatches = await MatchModel.find({ stage: worldCupStage }).select('_id').lean() as any[]
  const stageMatchIds = stageMatches.map((m: any) => m._id)

  const stagePredictions = await PredictionModel.find({
    leagueId: bracket.leagueId,
    matchId: { $in: stageMatchIds },
    pointsEarned: { $exists: true },
  }).lean() as any[]

  const userStageStats = new Map<string, { points: number; goals: number }>()
  for (const pred of stagePredictions) {
    const uid = String(pred.userId)
    const s = userStageStats.get(uid) ?? { points: 0, goals: 0 }
    s.points += pred.pointsEarned ?? 0
    s.goals += (pred.homeScore ?? 0) + (pred.awayScore ?? 0)
    userStageStats.set(uid, s)
  }

  const updatedMatchups = []
  const advancingUserIds: string[] = []

  for (const matchup of currentRound.matchups as any[]) {
    if (matchup.winnerId) {
      updatedMatchups.push(matchup)
      advancingUserIds.push(String(matchup.winnerId))
      continue
    }

    const homeStats = userStageStats.get(String(matchup.homeUserId)) ?? { points: 0, goals: 0 }
    const awayStats = matchup.awayUserId
      ? (userStageStats.get(String(matchup.awayUserId)) ?? { points: 0, goals: 0 })
      : null

    if (!matchup.awayUserId) {
      updatedMatchups.push({ ...matchup, homePoints: homeStats.points, winnerId: matchup.homeUserId })
      advancingUserIds.push(String(matchup.homeUserId))
      continue
    }

    const { winnerId, tiebreakerUsed } = resolveMatchup({
      matchupId: String(matchup._id),
      homeUserId: String(matchup.homeUserId),
      awayUserId: String(matchup.awayUserId),
      homePoints: homeStats.points,
      awayPoints: awayStats!.points,
      homeGoalsPredicted: homeStats.goals,
      awayGoalsPredicted: awayStats!.goals,
    })

    updatedMatchups.push({
      ...matchup,
      homePoints: homeStats.points,
      awayPoints: awayStats!.points,
      winnerId,
      ...(tiebreakerUsed ? { tiebreakerUsed } : {}),
    })
    advancingUserIds.push(winnerId)
  }

  const nextStage = nextCupStage(worldCupStage)

  if (!nextStage) {
    // Final completed
    await CupBracketModel.findByIdAndUpdate(bracket._id, {
      $set: {
        status: 'completed',
        winnerId: advancingUserIds[0],
        [`rounds.${currentRound.roundNumber - 1}.status`]: 'completed',
        [`rounds.${currentRound.roundNumber - 1}.matchups`]: updatedMatchups,
      },
    })
    return NextResponse.json({ ok: true, data: { completed: true, winnerId: advancingUserIds[0] } })
  }

  const allUsers = await UserModel.find({ _id: { $in: advancingUserIds } }).lean() as any[]
  const userNameMap = new Map(allUsers.map((u: any) => [String(u._id), u.name as string]))
  const nextMatchups = buildNextRoundMatchups(advancingUserIds, userNameMap)

  await CupBracketModel.findByIdAndUpdate(bracket._id, {
    $set: {
      [`rounds.${currentRound.roundNumber - 1}.status`]: 'completed',
      [`rounds.${currentRound.roundNumber - 1}.matchups`]: updatedMatchups,
    },
    $push: {
      rounds: {
        roundNumber: currentRound.roundNumber + 1,
        roundName: ROUND_NAMES[nextStage] ?? nextStage,
        worldCupStage: nextStage,
        status: 'active',
        matchups: nextMatchups,
      },
    },
  })

  const updated = await CupBracketModel.findById(bracket._id).lean()
  return NextResponse.json({ ok: true, data: updated })
}
