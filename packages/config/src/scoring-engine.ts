import type { ScoringConfig, PredictionBreakdown, MatchResult, MatchStage } from '@worldcup26/types'
import { isKnockoutStage } from './match-stages'

type MatchOutcome = 'home' | 'away' | 'draw'

function getOutcome(homeScore: number, awayScore: number): MatchOutcome {
  if (homeScore > awayScore) return 'home'
  if (awayScore > homeScore) return 'away'
  return 'draw'
}

export interface ScoreCalculationResult {
  points: number
  breakdown: PredictionBreakdown
}

export function calculatePredictionPoints(
  predHomeScore: number,
  predAwayScore: number,
  result: MatchResult,
  stage: MatchStage,
  config: ScoringConfig
): ScoreCalculationResult {
  const cfg = isKnockoutStage(stage) ? config.knockoutStage : config.groupStage

  const breakdown: PredictionBreakdown = {
    exactScore: false,
    correctResult: false,
    correctTeamAdvancing: false,
  }

  let points = 0

  const exactScore =
    predHomeScore === result.homeScore && predAwayScore === result.awayScore

  if (exactScore) {
    breakdown.exactScore = true
    points += cfg.exactScore
  } else {
    const predOutcome = getOutcome(predHomeScore, predAwayScore)
    const actualOutcome = getOutcome(result.homeScore, result.awayScore)
    if (predOutcome === actualOutcome) {
      breakdown.correctResult = true
      points += cfg.correctResult
    }
  }

  // Knockout bonus: correct team advancing (regardless of predicted score)
  if (isKnockoutStage(stage) && 'correctTeamAdvancing' in cfg) {
    const knockoutCfg = cfg as typeof config.knockoutStage
    if (knockoutCfg.correctTeamAdvancing > 0 && result.winner !== null) {
      // Determine which team the user picked to win (by score or penalty winner)
      const predictedWinner =
        predHomeScore > predAwayScore
          ? 'home'
          : predAwayScore > predHomeScore
            ? 'away'
            : null // predicted draw — no advancing pick

      // Resolve actual winner to home/away label
      const actualWinnerSide =
        result.penaltyWinner ?? result.winner

      if (predictedWinner !== null && actualWinnerSide === predictedWinner) {
        breakdown.correctTeamAdvancing = true
        points += knockoutCfg.correctTeamAdvancing
      }
    }
  }

  return { points, breakdown }
}
