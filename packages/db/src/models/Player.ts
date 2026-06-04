import { Schema, model, models, type Document } from 'mongoose'

export interface PlayerDocument extends Document {
  apiPlayerId: string
  name: string
  team: string                 // Team name or code
  position: string             // GK, DEF, MID, FWD
  shirtNumber?: number
  height?: number
  weight?: number
  birthDate?: Date
  nationality?: string
  marketValue?: number          // In euros
  photoUrl?: string
  apiSource: string            // 'football-data.org', etc.
  stats?: {
    appearances: number
    goals: number
    assists: number
    yellowCards: number
    redCards: number
  }
  lastUpdated: Date
  createdAt: Date
  updatedAt: Date
}

const StatsSchema = new Schema(
  {
    appearances: { type: Number, default: 0 },
    goals: { type: Number, default: 0 },
    assists: { type: Number, default: 0 },
    yellowCards: { type: Number, default: 0 },
    redCards: { type: Number, default: 0 },
  },
  { _id: false }
)

const PlayerSchema = new Schema<PlayerDocument>(
  {
    apiPlayerId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    team: { type: String, required: true },
    position: { type: String, required: true, enum: ['GK', 'DEF', 'MID', 'FWD'] },
    shirtNumber: { type: Number },
    height: { type: Number },
    weight: { type: Number },
    birthDate: { type: Date },
    nationality: { type: String },
    marketValue: { type: Number },          // In euros
    photoUrl: { type: String },
    apiSource: { type: String, default: 'football-data.org' },
    stats: { type: StatsSchema },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

// Indexes for fast queries
PlayerSchema.index({ apiPlayerId: 1 })
PlayerSchema.index({ team: 1 })
PlayerSchema.index({ position: 1 })
PlayerSchema.index({ team: 1, position: 1 })
PlayerSchema.index({ goals: -1 })  // For top scorers query

export const PlayerModel = models.Player || model<PlayerDocument>('Player', PlayerSchema)
