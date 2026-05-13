import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Resend from 'next-auth/providers/resend'
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import { connectDB, UserModel } from '@worldcup26/db'
import mongoose from 'mongoose'
import { nanoid } from 'nanoid'
import { authConfig } from './auth.config'

// Reuse the Mongoose MongoClient for the NextAuth adapter (magic link token storage)
const clientPromise = connectDB().then(() => mongoose.connection.getClient()) as any

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY!,
      from: process.env.EMAIL_FROM!,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      await connectDB()
      const existingUser = await UserModel.findOne({ email: user.email })
      if (!existingUser) {
        await UserModel.create({
          email: user.email,
          name: user.name ?? user.email?.split('@')[0] ?? 'Player',
          avatar: user.image ?? '',
          authProvider: account?.provider === 'google' ? 'google' : 'email',
          googleId: account?.provider === 'google' ? account.providerAccountId : undefined,
          apiKey: nanoid(32),
          timezone: 'UTC',
        })
      }
      return true
    },

    async session({ session }) {
      if (session.user?.email) {
        await connectDB()
        const dbUser = await UserModel.findOne({ email: session.user.email }).lean() as any
        if (dbUser) {
          session.user.id = String(dbUser._id)
          session.user.image = dbUser.avatar || session.user.image
        }
      }
      return session
    },

    async jwt({ token, user }) {
      if (user?.email) token.email = user.email
      return token
    },
  },
})
