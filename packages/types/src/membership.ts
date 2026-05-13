export type MemberRole = 'owner' | 'member'

export interface PointsHistoryEntry {
  matchId: string
  pointsEarned: number
  cumulativePoints: number
  rankAtTime: number
  timestamp: Date
}

export interface Membership {
  _id: string
  userId: string
  leagueId: string
  role: MemberRole
  totalPoints: number
  rank: number
  pointsHistory: PointsHistoryEntry[]
  joinedAt: Date
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  name: string
  avatar: string
  totalPoints: number
  lastRoundPoints: number
  rankChange: number // positive = moved up, negative = moved down
}
