import mongoose from 'mongoose'

const MONGO_URI = process.env.MONGODB_URI!

let connected = false

async function connectDB() {
  if (!connected) {
    await mongoose.connect(MONGO_URI)
    connected = true
  }
}

const UserSchema = new mongoose.Schema({
  email: String,
  name: String,
  apiKey: String,
})

const User = mongoose.models.User ?? mongoose.model('User', UserSchema)

export interface AuthedUser {
  userId: string
  email: string
  name: string
}

export async function validateApiKey(apiKey: string): Promise<AuthedUser | null> {
  await connectDB()
  const user = await User.findOne({ apiKey }).lean() as any
  if (!user) return null
  return { userId: String(user._id), email: user.email, name: user.name }
}

export function getApiKeyFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice(7)
}
