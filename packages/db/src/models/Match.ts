import { Schema, model, models, type Document } from 'mongoose'
import type { MatchStage, MatchStatus } from '@worldcup26/types'

export interface MatchDocument extends Document {
  apiMatchId: string
  stage: MatchStage
  group?: string
  round?: string
  homeTeam: {
    apiId: string
    name: string
    shortName: string
    logo: string
    flag: string
  }
  awayTeam: {
    apiId: string
    name: string
    shortName: string
    logo: string
    flag: string
  }
  kickoffAt: Date
  lockAt: Date
  status: MatchStatus
  result?: {
    homeScore: number
    awayScore: number
    winner: string | null
    isAfterExtraTime: boolean
    isAfterPenalties: boolean
    penaltyWinner?: string
  }
  venue: string
  city: string
  scoringCalculatedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const TeamInfoSchema = new Schema(
  {
    apiId: { type: String, required: true },
    name: { type: String, required: true },
    shortName: { type: String, required: true },
    logo: { type: String, default: '' },
    flag: { type: String, default: '' },
  },
  { _id: false }
)

const MatchResultSchema = new Schema(
  {
    homeScore: { type: Number, required: true },
    awayScore: { type: Number, required: true },
    winner: { type: String, default: null }, // apiTeamId or null for draw
    isAfterExtraTime: { type: Boolean, default: false },
    isAfterPenalties: { type: Boolean, default: false },
    penaltyWinner: { type: String },
  },
  { _id: false }
)

const MatchSchema = new Schema<MatchDocument>(
  {
    apiMatchId: { type: String, required: true, unique: true },
    stage: {
      type: String,
      enum: ['group', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'],
      required: true,
    },
    group: { type: String },
    round: { type: String },
    homeTeam: { type: TeamInfoSchema, required: true },
    awayTeam: { type: TeamInfoSchema, required: true },
    kickoffAt: { type: Date, required: true },
    lockAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['scheduled', 'locked', 'live', 'finished', 'postponed'],
      default: 'scheduled',
    },
    result: { type: MatchResultSchema },
    venue: { type: String, default: '' },
    city: { type: String, default: '' },
    scoringCalculatedAt: { type: Date },
  },
  { timestamps: true }
)

MatchSchema.index({ kickoffAt: 1 })
MatchSchema.index({ status: 1 })
MatchSchema.index({ stage: 1 })

export const MatchModel = models.Match || model<MatchDocument>('Match', MatchSchema)
