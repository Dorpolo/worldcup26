import { Schema, model, models, type Document } from 'mongoose'

export interface PointsHistoryEntry {
  matchId: Schema.Types.ObjectId
  pointsEarned: number
  cumulativePoints: number
  rankAtTime: number
  timestamp: Date
}

export interface MembershipDocument extends Document {
  userId: Schema.Types.ObjectId
  leagueId: Schema.Types.ObjectId
  role: 'owner' | 'member'
  totalPoints: number
  rank: number
  pointsHistory: PointsHistoryEntry[]
  joinedAt: Date
}

const PointsHistorySchema = new Schema<PointsHistoryEntry>(
  {
    matchId: { type: Schema.Types.ObjectId, ref: 'Match' },
    pointsEarned: { type: Number, required: true },
    cumulativePoints: { type: Number, required: true },
    rankAtTime: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
)

const MembershipSchema = new Schema<MembershipDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  leagueId: { type: Schema.Types.ObjectId, ref: 'League', required: true },
  role: { type: String, enum: ['owner', 'member'], required: true },
  totalPoints: { type: Number, default: 0 },
  rank: { type: Number, default: 0 },
  pointsHistory: { type: [PointsHistorySchema], default: [] },
  joinedAt: { type: Date, default: Date.now },
})

MembershipSchema.index({ userId: 1, leagueId: 1 }, { unique: true })
MembershipSchema.index({ leagueId: 1, totalPoints: -1 }) // fast leaderboard sort
MembershipSchema.index({ leagueId: 1 })

export const MembershipModel =
  models.Membership || model<MembershipDocument>('Membership', MembershipSchema)
