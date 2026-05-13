export interface PredictionBreakdown {
  exactScore: boolean
  correctResult: boolean
  correctTeamAdvancing: boolean
}

export interface Prediction {
  _id: string
  userId: string
  matchId: string
  leagueId: string
  homeScore: number
  awayScore: number
  isLocked: boolean
  pointsEarned?: number
  breakdown?: PredictionBreakdown
  submittedAt: Date
  updatedAt: Date
}

export type BonusPredictionType = 'tournament_winner' | 'top_scorer' | 'top_assist' | 'custom'

export interface BonusPrediction {
  _id: string
  userId: string
  leagueId: string
  type: BonusPredictionType
  customBonusId?: string
  value: string // team apiId, player apiId, or custom text
  valueLabel: string
  isLocked: boolean
  pointsEarned?: number
  submittedAt: Date
  updatedAt: Date
}

export interface PredictionDistributionEntry {
  homeScore: number
  awayScore: number
  count: number
  percentage: number
  memberIds: string[]
}
