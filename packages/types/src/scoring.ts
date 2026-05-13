export interface GroupStageScoringConfig {
  exactScore: number
  correctResult: number
}

export interface KnockoutStageScoringConfig {
  exactScore: number
  correctResult: number
  correctTeamAdvancing: number
}

export interface BonusItem {
  enabled: boolean
  points: number
}

export interface CustomBonus {
  _id: string
  label: string
  description: string
  points: number
}

export interface BonusScoringConfig {
  tournamentWinner: BonusItem
  topScorer: BonusItem
  topAssist: BonusItem
  custom: CustomBonus[]
}

export interface ScoringConfig {
  groupStage: GroupStageScoringConfig
  knockoutStage: KnockoutStageScoringConfig
  bonuses: BonusScoringConfig
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  groupStage: {
    exactScore: 3,
    correctResult: 1,
  },
  knockoutStage: {
    exactScore: 4,
    correctResult: 2,
    correctTeamAdvancing: 1,
  },
  bonuses: {
    tournamentWinner: { enabled: true, points: 10 },
    topScorer: { enabled: true, points: 5 },
    topAssist: { enabled: true, points: 5 },
    custom: [],
  },
}
