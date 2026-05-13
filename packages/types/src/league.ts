import type { ScoringConfig } from './scoring'

export interface InviteToken {
  token: string
  expiresAt: Date
  usedBy: string[]
}

export type LeagueStatus = 'draft' | 'active' | 'completed'
export type CupStatus = 'pending' | 'active' | 'completed'

export interface League {
  _id: string
  name: string
  slug: string
  avatar: string
  description: string
  ownerId: string
  scoringConfig: ScoringConfig
  inviteTokens: InviteToken[]
  status: LeagueStatus
  cupStatus: CupStatus
  memberCount: number
  createdAt: Date
  updatedAt: Date
}

export interface LeagueSummary {
  _id: string
  name: string
  slug: string
  avatar: string
  memberCount: number
  status: LeagueStatus
  // viewer's current standing in this league
  myRank: number
  myPoints: number
}
