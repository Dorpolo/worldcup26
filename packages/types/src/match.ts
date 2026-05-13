export type MatchStage =
  | 'group'
  | 'round_of_16'
  | 'quarter_final'
  | 'semi_final'
  | 'third_place'
  | 'final'

export type MatchStatus = 'scheduled' | 'locked' | 'live' | 'finished' | 'postponed'

export interface TeamInfo {
  apiId: string
  name: string
  shortName: string // 3-letter code e.g. "BRA"
  logo: string
  flag: string
}

export interface MatchResult {
  homeScore: number
  awayScore: number
  winner: string | null // apiTeamId or null for draw
  isAfterExtraTime: boolean
  isAfterPenalties: boolean
  penaltyWinner?: string // apiTeamId — knockout only
}

export interface Match {
  _id: string
  apiMatchId: string
  stage: MatchStage
  group?: string // 'A'–'H'
  round?: string // display string
  homeTeam: TeamInfo
  awayTeam: TeamInfo
  kickoffAt: Date
  lockAt: Date // kickoffAt - 15min
  status: MatchStatus
  result?: MatchResult
  venue: string
  city: string
  scoringCalculatedAt?: Date
  createdAt: Date
  updatedAt: Date
}
