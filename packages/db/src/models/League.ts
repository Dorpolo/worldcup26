import { Schema, model, models, type Document } from 'mongoose'
import { DEFAULT_SCORING_CONFIG } from '@worldcup26/types'

export interface LeagueDocument extends Document {
  name: string
  slug: string
  avatar: string
  description: string
  ownerId: Schema.Types.ObjectId
  scoringConfig: typeof DEFAULT_SCORING_CONFIG
  inviteTokens: Array<{
    token: string
    expiresAt: Date
    usedBy: Schema.Types.ObjectId[]
  }>
  status: 'draft' | 'active' | 'completed'
  cupStatus: 'pending' | 'active' | 'completed'
  memberCount: number
  createdAt: Date
  updatedAt: Date
}

const BonusItemSchema = new Schema({ enabled: Boolean, points: Number }, { _id: false })
const CustomBonusSchema = new Schema(
  { label: String, description: String, points: Number },
  { _id: true }
)

const ScoringConfigSchema = new Schema(
  {
    groupStage: {
      exactScore: { type: Number, default: 3 },
      correctResult: { type: Number, default: 1 },
    },
    knockoutStage: {
      exactScore: { type: Number, default: 4 },
      correctResult: { type: Number, default: 2 },
      correctTeamAdvancing: { type: Number, default: 1 },
    },
    bonuses: {
      tournamentWinner: { type: BonusItemSchema, default: { enabled: true, points: 10 } },
      topScorer: { type: BonusItemSchema, default: { enabled: true, points: 5 } },
      topAssist: { type: BonusItemSchema, default: { enabled: true, points: 5 } },
      custom: { type: [CustomBonusSchema], default: [] },
    },
  },
  { _id: false }
)

const InviteTokenSchema = new Schema(
  {
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    usedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { _id: false }
)

const LeagueSchema = new Schema<LeagueDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    avatar: { type: String, default: '' },
    description: { type: String, default: '' },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    scoringConfig: { type: ScoringConfigSchema, default: () => DEFAULT_SCORING_CONFIG },
    inviteTokens: { type: [InviteTokenSchema], default: [] },
    status: { type: String, enum: ['draft', 'active', 'completed'], default: 'draft' },
    cupStatus: { type: String, enum: ['pending', 'active', 'completed'], default: 'pending' },
    memberCount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

LeagueSchema.index({ ownerId: 1 })
LeagueSchema.index({ 'inviteTokens.token': 1 }, { sparse: true })

export const LeagueModel = models.League || model<LeagueDocument>('League', LeagueSchema)
