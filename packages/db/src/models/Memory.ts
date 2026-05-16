import { Schema, model, models, type Document } from 'mongoose'

export type MemoryCategory = 'preferences' | 'league-notes' | 'player-observations' | 'strategy' | 'personal'
export type MemorySource   = 'auto' | 'manual'

export interface MemoryDocument extends Document {
  userId:    Schema.Types.ObjectId
  leagueId?: Schema.Types.ObjectId
  content:   string
  category:  MemoryCategory
  source:    MemorySource
  createdAt: Date
  updatedAt: Date
}

const MemorySchema = new Schema<MemoryDocument>(
  {
    userId:   { type: Schema.Types.ObjectId, ref: 'User',   required: true },
    leagueId: { type: Schema.Types.ObjectId, ref: 'League', required: false },
    content:  { type: String, required: true, maxlength: 500 },
    category: {
      type: String,
      enum: ['preferences', 'league-notes', 'player-observations', 'strategy', 'personal'],
      default: 'personal',
    },
    source: { type: String, enum: ['auto', 'manual'], default: 'manual' },
  },
  { timestamps: true }
)

MemorySchema.index({ userId: 1, createdAt: -1 })
MemorySchema.index({ userId: 1, leagueId: 1 })

export const MemoryModel =
  models.Memory || model<MemoryDocument>('Memory', MemorySchema)
