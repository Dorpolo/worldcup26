import { Schema, model, models, type Document } from 'mongoose'

export interface UserDocument extends Document {
  email: string
  name: string
  avatar: string
  timezone: string
  authProvider: 'email' | 'google'
  googleId?: string
  apiKey: string
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    avatar: { type: String, default: '' },
    timezone: { type: String, default: 'UTC' },
    authProvider: { type: String, enum: ['email', 'google'], required: true },
    googleId: { type: String, sparse: true },
    apiKey: { type: String, required: true }, // stored as-is, generated with nanoid(32)
  },
  { timestamps: true }
)

UserSchema.index({ googleId: 1 }, { sparse: true })

export const UserModel = models.User || model<UserDocument>('User', UserSchema)
