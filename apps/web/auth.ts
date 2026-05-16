import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { connectDB, UserModel } from '@worldcup26/db'
import { nanoid } from 'nanoid'
import { authConfig } from './auth.config'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
