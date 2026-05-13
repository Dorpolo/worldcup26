import mongoose from 'mongoose'

// Singleton pattern — safe for Next.js hot reload in dev
const globalWithMongoose = global as typeof globalThis & {
  mongooseCache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
}

if (!globalWithMongoose.mongooseCache) {
  globalWithMongoose.mongooseCache = { conn: null, promise: null }
}

const cache = globalWithMongoose.mongooseCache

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn

  if (!cache.promise) {
    const uri = process.env.MONGODB_URI
    if (!uri) throw new Error('MONGODB_URI environment variable is not set')

    cache.promise = mongoose.connect(uri, {
      bufferCommands: false,
      maxPoolSize: 10,
    })
  }

  cache.conn = await cache.promise
  return cache.conn
}

export { mongoose }
