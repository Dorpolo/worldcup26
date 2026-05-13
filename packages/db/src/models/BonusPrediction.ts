import { Schema, model, models, type Document } from 'mongoose'
import type { BonusPredictionType } from '@worldcup26/types'

export interface BonusPredictionDocument extends Document {
  userId: Schema.Types.ObjectId
  leagueId: Schema.Types.ObjectId
  type: BonusPredictionType
  customBonusId?: string
  value: string
  valueLabel: string
  isLocked: boolean
  pointsEarned?: number
  submittedAt: Date
  updatedAt: Date
}

const BonusPredictionSchema = new Schema<BonusPredictionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    leagueId: { type: Schema.Types.ObjectId, ref: 'League', required: true },
    type: {
      type: String,
      enum: ['tournament_winner', 'top_scorer', 'top_assist', 'custom'],
      required: true,
    },
    customBonusId: { type: String },
    value: { type: String, required: true },
    valueLabel: { type: String, required: true },
    isLocked: { type: Boolean, default: false },
    pointsEarned: { type: Number },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

BonusPredictionSchema.index({ userId: 1, leagueId: 1, type: 1 })
BonusPredictionSchema.index({ leagueId: 1 })

export const BonusPredictionModel =
  models.BonusPrediction ||
  model<BonusPredictionDocument>('BonusPrediction', BonusPredictionSchema)
