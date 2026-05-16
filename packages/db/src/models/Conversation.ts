import { Schema, model, models, type Document } from 'mongoose'

export interface ConversationDocument extends Document {
  userId: Schema.Types.ObjectId
  leagueId: Schema.Types.ObjectId
  title: string
  messageCount: number
  createdAt: Date
  updatedAt: Date
}

const ConversationSchema = new Schema<ConversationDocument>(
  {
    userId:       { type: Schema.Types.ObjectId, ref: 'User',   required: true },
    leagueId:     { type: Schema.Types.ObjectId, ref: 'League', required: true },
    title:        { type: String, default: 'New conversation', maxlength: 120 },
    messageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

ConversationSchema.index({ userId: 1, leagueId: 1, updatedAt: -1 })
ConversationSchema.index({ userId: 1, leagueId: 1, createdAt: -1 })

export const ConversationModel =
  models.Conversation || model<ConversationDocument>('Conversation', ConversationSchema)
