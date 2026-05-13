import type { MatchStage } from './match'

export type CupRoundName =
  | 'round_of_32'
  | 'round_of_16'
  | 'quarter_final'
  | 'semi_final'
  | 'final'

export type TiebreakerMethod = 'goals_predicted' | 'head_to_head' | 'random'

export interface CupMatchup {
  _id: string
  homeUserId: string
  awayUserId: string | null // null = bye
  homePoints: number
  awayPoints: number
  winnerId?: string
  tiebreakerUsed?: TiebreakerMethod
  isBye: boolean
}

export interface CupRound {
  roundNumber: number
  roundName: string
  worldCupStage: MatchStage
  status: 'pending' | 'active' | 'completed'
  matchups: CupMatchup[]
}

export interface CupBracket {
  _id: string
  leagueId: string
  status: 'pending' | 'active' | 'completed'
  startRound: CupRoundName
  rounds: CupRound[]
  winnerId?: string
  createdAt: Date
  updatedAt: Date
}
