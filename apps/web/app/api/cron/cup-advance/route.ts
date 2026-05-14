import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/auth-helpers'
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

export async function POST(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  // Find all active brackets
  const brackets = await CupBracketModel.find({ status: 'active' }).lean() as any[]

  const results: Array<{ leagueId: string; advanced: boolean; reason?: string }> = []

  for (const bracket of brackets) {
    const leagueId = String(bracket.leagueId)
    const currentRound = (bracket.rounds as any[]).find((r: any) => r.status === 'active')
    if (!currentRound) {
      results.push({ leagueId, advanced: false, reason: 'no active round' })
      continue
    }

    const worldCupStage = currentRound.worldCupStage as MatchStage

    // Check all matches in this WC stage are finished and scored
    const totalInStage = await MatchModel.countDocuments({ stage: worldCupStage })
    const finishedAndScored = await MatchModel.countDocuments({
      stage: worldCupStage,
      status: 'finished',
      scoringCalculatedAt: { $exists: true },
    })

    if (totalInStage === 0 || finishedAndScored < totalInStage) {
      results.push({
        leagueId,
        advanced: false,
        reason: `stage ${worldCupStage}: ${finishedAndScored}/${totalInStage} matches scored`,
      })
      continue
    }

    // If the round is already resolved (all matchups have winners), skip
    const allDecided = (currentRound.matchups as any[]).every((m: any) => !!m.winnerId)
    if (allDecided && currentRound.status === 'completed') {
      results.push({ leagueId, advanced: false, reason: 'round already completed' })
      continue
    }

    // Get all match IDs for this WC stage
    const stageMatches = await MatchModel.find({ stage: worldCupStage })
      .select('_id')
      .lean() as any[]
    const stageMatchIds = stageMatches.map((m: any) => m._id)

    // For each matchup in the current round, sum points from predictions on stage matches
    const updatedMatchups = []
    const advancingUserIds: string[] = []

    // Pre-fetch all predictions for this league + stage in one query
    const stagePredictions = await PredictionModel.find({
      leagueId: bracket.leagueId,
      matchId: { $in: stageMatchIds },
      pointsEarned: { $exists: true },
    }).lean() as any[]

    // Build userId → { points, goalsPredicted } map
    const userStageStats = new Map<string, { points: number; goals: number }>()
    for (const pred of stagePredictions) {
      const uid = String(pred.userId)
      const existing = userStageStats.get(uid) ?? { points: 0, goals: 0 }
      existing.points += pred.pointsEarned ?? 0
      existing.goals += (pred.homeScore ?? 0) + (pred.awayScore ?? 0)
      userStageStats.set(uid, existing)
    }

    for (const matchup of currentRound.matchups as any[]) {
      if (matchup.winnerId) {
        // Already decided (e.g. bye)
        updatedMatchups.push(matchup)
        advancingUserIds.push(String(matchup.winnerId))
        continue
      }

      const homeStats = userStageStats.get(String(matchup.homeUserId)) ?? { points: 0, goals: 0 }
      const awayStats = matchup.awayUserId
        ? (userStageStats.get(String(matchup.awayUserId)) ?? { points: 0, goals: 0 })
        : null

      if (!matchup.awayUserId) {
        // Should have been set as bye already, but handle gracefully
        updatedMatchups.push({
          ...matchup,
          homePoints: homeStats.points,
          winnerId: matchup.homeUserId,
        })
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

    // Check if this was the final round
    const nextStage = nextCupStage(worldCupStage)
    const isFinal = nextStage === null

    if (isFinal) {
      // Cup is over — mark completed
      await CupBracketModel.findByIdAndUpdate(bracket._id, {
        $set: {
          status: 'completed',
          winnerId: advancingUserIds[0],
          [`rounds.${currentRound.roundNumber - 1}.status`]: 'completed',
          [`rounds.${currentRound.roundNumber - 1}.matchups`]: updatedMatchups,
        },
      })
      results.push({ leagueId, advanced: true, reason: 'cup completed' })
      continue
    }

    // Build next round matchups
    const allUsers = await UserModel.find({
      _id: { $in: advancingUserIds },
    }).lean() as any[]
    const userNameMap = new Map(allUsers.map((u: any) => [String(u._id), u.name as string]))

    const nextMatchups = buildNextRoundMatchups(advancingUserIds, userNameMap)
    const nextRoundNumber = currentRound.roundNumber + 1

    await CupBracketModel.findByIdAndUpdate(bracket._id, {
      $set: {
        [`rounds.${currentRound.roundNumber - 1}.status`]: 'completed',
        [`rounds.${currentRound.roundNumber - 1}.matchups`]: updatedMatchups,
      },
      $push: {
        rounds: {
          roundNumber: nextRoundNumber,
          roundName: ROUND_NAMES[nextStage] ?? nextStage,
          worldCupStage: nextStage,
          status: 'active',
          matchups: nextMatchups,
        },
      },
    })

    results.push({ leagueId, advanced: true, reason: `advanced to ${nextStage}` })
  }

  return NextResponse.json({ ok: true, data: results })
}

const ROUND_NAMES: Record<string, string> = {
  round_of_16: 'Round of 16',
  quarter_final: 'Quarter Finals',
  semi_final: 'Semi Finals',
  final: 'Final',
}
