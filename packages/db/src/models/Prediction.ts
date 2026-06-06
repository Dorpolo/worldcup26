import { Schema, model, models, type Document } from 'mongoose'

export interface PredictionDocument extends Document {
  userId: Schema.Types.ObjectId
  matchId: Schema.Types.ObjectId
  leagueId: Schema.Types.ObjectId
  homeScore: number
  awayScore: number
  isLocked: boolean
  pointsEarned?: number
  breakdown?: {
    exactScore: boolean
    correctResult: boolean
    correctTeamAdvancing: boolean
  }
  topScorerPlayerId?: Schema.Types.ObjectId  // Reference to Player model
  topScorerName?: string                      // Fallback if player not in DB
  topScorerTeam?: string
  polyMarketBet?: number                      // Points bet in Polly Market (0 = no bet)
  polyMarketWon?: boolean                     // Did the market bet win
  submittedAt: Date
  updatedAt: Date
}

const BreakdownSchema = new Schema(
  {
    exactScore: { type: Boolean, default: false },
    correctResult: { type: Boolean, default: false },
    correctTeamAdvancing: { type: Boolean, default: false },
  },
  { _id: false }
)

const PredictionSchema = new Schema<PredictionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
    leagueId: { type: Schema.Types.ObjectId, ref: 'League', required: true },
    homeScore: { type: Number, required: true, min: 0 },
    awayScore: { type: Number, required: true, min: 0 },
    isLocked: { type: Boolean, default: false },
    pointsEarned: { type: Number },
    breakdown: { type: BreakdownSchema },
    topScorerPlayerId: { type: Schema.Types.ObjectId, ref: 'Player' },
    topScorerName: { type: String },
    topScorerTeam: { type: String },
    polyMarketBet: { type: Number, default: 0 },
    polyMarketWon: { type: Boolean },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

PredictionSchema.index({ userId: 1, matchId: 1, leagueId: 1 }, { unique: true })
PredictionSchema.index({ matchId: 1, leagueId: 1 }) // distribution queries
PredictionSchema.index({ leagueId: 1, userId: 1 })
PredictionSchema.index({ matchId: 1, isLocked: 1 })

export const PredictionModel =
  models.Prediction || model<PredictionDocument>('Prediction', PredictionSchema)
