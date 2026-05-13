import { Schema, model, models, type Document } from 'mongoose'
import type { CupRoundName, TiebreakerMethod, MatchStage } from '@worldcup26/types'

export interface CupBracketDocument extends Document {
  leagueId: Schema.Types.ObjectId
  status: 'pending' | 'active' | 'completed'
  startRound: CupRoundName
  rounds: Array<{
    roundNumber: number
    roundName: string
    worldCupStage: MatchStage
    status: 'pending' | 'active' | 'completed'
    matchups: Array<{
      _id: Schema.Types.ObjectId
      homeUserId: Schema.Types.ObjectId
      awayUserId: Schema.Types.ObjectId | null
      homePoints: number
      awayPoints: number
      winnerId?: Schema.Types.ObjectId
      tiebreakerUsed?: TiebreakerMethod
      isBye: boolean
    }>
  }>
  winnerId?: Schema.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const CupMatchupSchema = new Schema({
  homeUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  awayUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  homePoints: { type: Number, default: 0 },
  awayPoints: { type: Number, default: 0 },
  winnerId: { type: Schema.Types.ObjectId, ref: 'User' },
  tiebreakerUsed: {
    type: String,
    enum: ['goals_predicted', 'head_to_head', 'random'],
  },
  isBye: { type: Boolean, default: false },
})

const CupRoundSchema = new Schema(
  {
    roundNumber: { type: Number, required: true },
    roundName: { type: String, required: true },
    worldCupStage: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed'],
      default: 'pending',
    },
    matchups: { type: [CupMatchupSchema], default: [] },
  },
  { _id: false }
)

const CupBracketSchema = new Schema<CupBracketDocument>(
  {
    leagueId: { type: Schema.Types.ObjectId, ref: 'League', required: true, unique: true },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed'],
      default: 'pending',
    },
    startRound: {
      type: String,
      enum: ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'final'],
      required: true,
    },
    rounds: { type: [CupRoundSchema], default: [] },
    winnerId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

export const CupBracketModel =
  models.CupBracket || model<CupBracketDocument>('CupBracket', CupBracketSchema)
