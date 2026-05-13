import type { CupRoundName } from '@worldcup26/types'

// Maps bracket size → cup start round
const BRACKET_TO_ROUND: Record<number, CupRoundName> = {
  2: 'final',
  4: 'semi_final',
  8: 'quarter_final',
  16: 'round_of_16',
  32: 'round_of_32',
}

/**
 * Returns the cup start round and effective bracket size for a given member count.
 * Members beyond bracketSize receive byes in the first round.
 *
 * Examples:
 *   5 members → bracketSize=4, startRound='semi_final', byes=1 (4 play in QF, 1 gets bye)
 *  13 members → bracketSize=8, startRound='quarter_final', byes=3
 */
export function getCupConfig(memberCount: number): {
  startRound: CupRoundName
  bracketSize: number
  byeCount: number
} {
  if (memberCount < 2) {
    throw new Error('A cup requires at least 2 members')
  }

  // Largest power of 2 that is ≤ memberCount, capped at 32
  const bracketSize = Math.min(
    Math.pow(2, Math.floor(Math.log2(memberCount))),
    32
  )

  const startRound = BRACKET_TO_ROUND[bracketSize] ?? 'round_of_32'
  const byeCount = memberCount - bracketSize

  return { startRound, bracketSize, byeCount }
}

/**
 * Builds the initial cup seedings from a shuffled member list.
 * Returns pairs [homeUserId, awayUserId | null] where null = bye.
 */
export function buildCupMatchups(
  memberIds: string[]
): Array<{ homeUserId: string; awayUserId: string | null }> {
  const { bracketSize, byeCount } = getCupConfig(memberIds.length)

  // Top-seeded members (first byeCount) get byes
  const byeMembers = memberIds.slice(0, byeCount)
  const activeMembers = memberIds.slice(byeCount)

  const matchups: Array<{ homeUserId: string; awayUserId: string | null }> = []

  // Bye matchups
  for (const userId of byeMembers) {
    matchups.push({ homeUserId: userId, awayUserId: null })
  }

  // Active bracket matchups
  for (let i = 0; i < activeMembers.length; i += 2) {
    matchups.push({
      homeUserId: activeMembers[i],
      awayUserId: activeMembers[i + 1] ?? null,
    })
  }

  return matchups
}
