import { Schema, model, models, type Document } from 'mongoose'

export interface ChatMessageDocument extends Document {
  userId: Schema.Types.ObjectId
  leagueId: Schema.Types.ObjectId
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
}

const ChatMessageSchema = new Schema<ChatMessageDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    leagueId: { type: Schema.Types.ObjectId, ref: 'League', required: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
)

ChatMessageSchema.index({ userId: 1, leagueId: 1, createdAt: -1 })

export const ChatMessageModel =
  models.ChatMessage || model<ChatMessageDocument>('ChatMessage', ChatMessageSchema)
