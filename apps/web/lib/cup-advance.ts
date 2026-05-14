/**
 * Cup round advancement logic.
 *
 * Each cup round maps to a World Cup stage. Once all matches in that stage are
 * finished and scored, this module:
 *   1. Sums points each member earned from predictions on that stage's matches
 *   2. Resolves each matchup winner (with tiebreakers if needed)
 *   3. Marks the current round as completed
 *   4. Creates the next round with the advancing players
 */

import { nanoid } from 'nanoid'
import type { MatchStage } from '@worldcup26/types'
import type { TiebreakerMethod } from '@worldcup26/types'

// Cup round sequence — always progresses in this order
const ROUND_SEQUENCE: MatchStage[] = [
  'round_of_16',
  'quarter_final',
  'semi_final',
  'final',
]

const ROUND_NAMES: Record<string, string> = {
  round_of_16: 'Round of 16',
  quarter_final: 'Quarter Finals',
  semi_final: 'Semi Finals',
  final: 'Final',
}

export interface MatchupResult {
  matchupId: string
  homeUserId: string
  awayUserId: string | null
  homePoints: number
  awayPoints: number
  winnerId: string
  tiebreakerUsed?: TiebreakerMethod
}

/**
 * Returns the next stage after the given one (for cup round progression).
 */
export function nextCupStage(current: MatchStage): MatchStage | null {
  const idx = ROUND_SEQUENCE.indexOf(current)
  if (idx === -1 || idx === ROUND_SEQUENCE.length - 1) return null
  return ROUND_SEQUENCE[idx + 1]
}

/**
 * Resolves a single matchup winner given accumulated points for each player.
 * Tiebreaker order:
 *   1. Total predicted goals across all predictions in the stage
 *   2. Head-to-head total goals (same as above — captured in goalsPredicted param)
 *   3. Random (seeded by matchupId for reproducibility)
 */
export function resolveMatchup(opts: {
  matchupId: string
  homeUserId: string
  awayUserId: string
  homePoints: number
  awayPoints: number
  homeGoalsPredicted: number
  awayGoalsPredicted: number
}): { winnerId: string; tiebreakerUsed?: TiebreakerMethod } {
  const {
    matchupId,
    homeUserId,
    awayUserId,
    homePoints,
    awayPoints,
    homeGoalsPredicted,
    awayGoalsPredicted,
  } = opts

  if (homePoints !== awayPoints) {
    return { winnerId: homePoints > awayPoints ? homeUserId : awayUserId }
  }

  // Tiebreaker 1: goals predicted
  if (homeGoalsPredicted !== awayGoalsPredicted) {
    return {
      winnerId: homeGoalsPredicted > awayGoalsPredicted ? homeUserId : awayUserId,
      tiebreakerUsed: 'goals_predicted',
    }
  }

  // Tiebreaker 2: random (seeded by matchupId hash for reproducibility)
  const seed = matchupId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return {
    winnerId: seed % 2 === 0 ? homeUserId : awayUserId,
    tiebreakerUsed: 'random',
  }
}

/**
 * Builds the next round's matchups from a list of advancing player IDs.
 * Players are paired in order (1 vs 2, 3 vs 4, ...).
 */
export function buildNextRoundMatchups(
  advancingUserIds: string[],
  userNameMap: Map<string, string>
): Array<{
  _id: string
  homeUserId: string
  awayUserId: string | null
  homeUserName: string
  awayUserName: string | null
  homePoints: number
  awayPoints: number
  isBye: boolean
  winnerId?: string
}> {
  const matchups = []
  for (let i = 0; i < advancingUserIds.length; i += 2) {
    const homeId = advancingUserIds[i]
    const awayId = advancingUserIds[i + 1] ?? null
    const isBye = awayId === null
    matchups.push({
      _id: nanoid(),
      homeUserId: homeId,
      awayUserId: awayId,
      homeUserName: userNameMap.get(homeId) ?? 'Unknown',
      awayUserName: awayId ? (userNameMap.get(awayId) ?? 'Unknown') : null,
      homePoints: 0,
      awayPoints: 0,
      isBye,
      winnerId: isBye ? homeId : undefined,
    })
  }
  return matchups
}
