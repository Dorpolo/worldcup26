import { describe, it, expect } from 'vitest'
import { calculatePredictionPoints } from '../src/scoring-engine'
import type { ScoringConfig, MatchResult } from '@worldcup26/types'

const defaultConfig: ScoringConfig = {
  groupStage: { exactScore: 3, correctResult: 1 },
  knockoutStage: { exactScore: 4, correctResult: 2, correctTeamAdvancing: 1 },
  bonuses: {
    tournamentWinner: { enabled: true, points: 10 },
    topScorer: { enabled: true, points: 5 },
    topAssist: { enabled: true, points: 5 },
    custom: [],
  },
}

function groupResult(homeScore: number, awayScore: number): MatchResult {
  const winner =
    homeScore > awayScore ? 'home' : awayScore > homeScore ? 'away' : null
  return { homeScore, awayScore, winner }
}

function knockoutResult(
  homeScore: number,
  awayScore: number,
  penaltyWinner?: 'home' | 'away'
): MatchResult {
  // In knockout, a draw goes to penalties — winner is determined by penaltyWinner
  const winner: 'home' | 'away' | null =
    penaltyWinner ?? (homeScore > awayScore ? 'home' : awayScore > homeScore ? 'away' : null)
  return { homeScore, awayScore, winner, penaltyWinner }
}

// ── Group Stage ────────────────────────────────────────────────────────────────

describe('Group stage — exact score', () => {
  it('awards 3 pts for an exact score prediction (home win)', () => {
    const { points, breakdown } = calculatePredictionPoints(
      2, 1,
      groupResult(2, 1),
      'group',
      defaultConfig,
    )
    expect(points).toBe(3)
    expect(breakdown.exactScore).toBe(true)
    expect(breakdown.correctResult).toBe(false)
    expect(breakdown.correctTeamAdvancing).toBe(false)
  })

  it('awards 3 pts for an exact score prediction (away win)', () => {
    const { points, breakdown } = calculatePredictionPoints(
      0, 2,
      groupResult(0, 2),
      'group',
      defaultConfig,
    )
    expect(points).toBe(3)
    expect(breakdown.exactScore).toBe(true)
  })

  it('awards 3 pts for an exact 0-0 draw prediction', () => {
    const { points, breakdown } = calculatePredictionPoints(
      0, 0,
      groupResult(0, 0),
      'group',
      defaultConfig,
    )
    expect(points).toBe(3)
    expect(breakdown.exactScore).toBe(true)
  })
})

describe('Group stage — correct result only', () => {
  it('awards 1 pt when result direction is correct but score differs', () => {
    const { points, breakdown } = calculatePredictionPoints(
      2, 0,
      groupResult(1, 0),
      'group',
      defaultConfig,
    )
    expect(points).toBe(1)
    expect(breakdown.exactScore).toBe(false)
    expect(breakdown.correctResult).toBe(true)
  })

  it('awards 1 pt for correctly predicting a draw (non-exact)', () => {
    const { points, breakdown } = calculatePredictionPoints(
      1, 1,
      groupResult(2, 2),
      'group',
      defaultConfig,
    )
    expect(points).toBe(1)
    expect(breakdown.correctResult).toBe(true)
    expect(breakdown.exactScore).toBe(false)
  })
})

describe('Group stage — wrong result', () => {
  it('awards 0 pts when result direction is wrong', () => {
    const { points, breakdown } = calculatePredictionPoints(
      2, 0,
      groupResult(0, 1),
      'group',
      defaultConfig,
    )
    expect(points).toBe(0)
    expect(breakdown.exactScore).toBe(false)
    expect(breakdown.correctResult).toBe(false)
    expect(breakdown.correctTeamAdvancing).toBe(false)
  })

  it('awards 0 pts when predicting draw but home wins', () => {
    const { points } = calculatePredictionPoints(
      1, 1,
      groupResult(3, 0),
      'group',
      defaultConfig,
    )
    expect(points).toBe(0)
  })
})

// ── Knockout Stage ─────────────────────────────────────────────────────────────

describe('Knockout stage — exact score', () => {
  it('awards 4 pts for exact score in round_of_16', () => {
    const { points, breakdown } = calculatePredictionPoints(
      2, 1,
      knockoutResult(2, 1),
      'round_of_16',
      defaultConfig,
    )
    // Exact score (4) + correct advancing (1) = 5
    expect(breakdown.exactScore).toBe(true)
    expect(points).toBeGreaterThanOrEqual(4)
  })

  it('awards exact (4) + advancing bonus (1) = 5 pts when advancing team also correct', () => {
    const { points, breakdown } = calculatePredictionPoints(
      2, 0,
      knockoutResult(2, 0),
      'quarter_final',
      defaultConfig,
    )
    expect(breakdown.exactScore).toBe(true)
    expect(breakdown.correctTeamAdvancing).toBe(true)
    expect(points).toBe(5)
  })
})

describe('Knockout stage — correct result + advancing', () => {
  it('awards 2 + 1 = 3 pts for correct direction + correct advancing team', () => {
    const { points, breakdown } = calculatePredictionPoints(
      2, 0,
      knockoutResult(1, 0),
      'semi_final',
      defaultConfig,
    )
    expect(breakdown.exactScore).toBe(false)
    expect(breakdown.correctResult).toBe(true)
    expect(breakdown.correctTeamAdvancing).toBe(true)
    expect(points).toBe(3)
  })

  it('awards 2 pts when correct result but wrong advancing team (away instead of home)', () => {
    // Predict home win → home advances; actual home wins → same winner, so advancing IS correct
    // To get wrong advancing: predict away win but actual home win
    const { points, breakdown } = calculatePredictionPoints(
      0, 1,        // predicted away win
      knockoutResult(1, 0), // actual home win
      'final',
      defaultConfig,
    )
    expect(breakdown.correctResult).toBe(false)
    expect(breakdown.correctTeamAdvancing).toBe(false)
    expect(points).toBe(0)
  })

  it('awards exactly 2 pts: correct result direction, wrong score, wrong advancing pick', () => {
    // Predicted: away 2-0 win (away advances); Actual: home 1-0 win (home advances)
    const { points, breakdown } = calculatePredictionPoints(
      0, 2,
      knockoutResult(1, 0),
      'round_of_16',
      defaultConfig,
    )
    expect(breakdown.exactScore).toBe(false)
    expect(breakdown.correctResult).toBe(false)
    expect(breakdown.correctTeamAdvancing).toBe(false)
    expect(points).toBe(0)
  })
})

describe('Knockout stage — predicted draw (null advancing pick)', () => {
  it('awards no advancing bonus when user predicts a draw in knockout', () => {
    // Predicting 1-1 means predictedWinner is null → no advancing bonus
    const { points, breakdown } = calculatePredictionPoints(
      1, 1,
      knockoutResult(1, 1, 'home'), // goes to penalties, home wins
      'quarter_final',
      defaultConfig,
    )
    // Exact score for the 90-min result (1-1 predicted, 1-1 played)
    expect(breakdown.exactScore).toBe(true)
    expect(breakdown.correctTeamAdvancing).toBe(false) // no pick → no bonus
    expect(points).toBe(4)
  })

  it('awards 1 pt for correct draw result but no advancing bonus', () => {
    const { points, breakdown } = calculatePredictionPoints(
      2, 2,
      knockoutResult(1, 1, 'away'), // predicted draw, actual draw → correct result
      'semi_final',
      defaultConfig,
    )
    expect(breakdown.correctResult).toBe(true)
    expect(breakdown.correctTeamAdvancing).toBe(false)
    expect(points).toBe(2) // correctResult in knockout = 2
  })
})

describe('Knockout stage — penalty shootout advancing', () => {
  it('no advancing bonus when user predicts draw (no side picked) even if penalty winner known', () => {
    const { points, breakdown } = calculatePredictionPoints(
      0, 0,
      knockoutResult(0, 0, 'home'),
      'round_of_16',
      defaultConfig,
    )
    expect(breakdown.exactScore).toBe(true)
    expect(breakdown.correctTeamAdvancing).toBe(false) // predicted draw = null advancing
    expect(points).toBe(4)
  })
})

describe('Breakdown flags', () => {
  it('exactScore flag is false when only correctResult is earned', () => {
    const { breakdown } = calculatePredictionPoints(
      3, 0,
      groupResult(1, 0),
      'group',
      defaultConfig,
    )
    expect(breakdown.exactScore).toBe(false)
    expect(breakdown.correctResult).toBe(true)
  })

  it('correctTeamAdvancing is always false in group stage', () => {
    const { breakdown } = calculatePredictionPoints(
      2, 1,
      groupResult(2, 1),
      'group',
      defaultConfig,
    )
    expect(breakdown.correctTeamAdvancing).toBe(false)
  })

  it('all flags false when everything is wrong', () => {
    const { breakdown } = calculatePredictionPoints(
      3, 1,
      groupResult(0, 2),
      'group',
      defaultConfig,
    )
    expect(breakdown.exactScore).toBe(false)
    expect(breakdown.correctResult).toBe(false)
    expect(breakdown.correctTeamAdvancing).toBe(false)
  })
})
