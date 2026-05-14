import type { NextAuthConfig } from 'next-auth'

// Edge-safe auth config — no Mongoose/DB imports allowed here.
// Used by middleware.ts which runs in Edge Runtime.
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
    verifyRequest: '/verify',
    error: '/login',
  },
  callbacks: {
    authorized({ auth, request }) {
      const { nextUrl, headers } = request
      const isLoggedIn = !!auth?.user
      const isAuthRoute =
        nextUrl.pathname.startsWith('/login') ||
        nextUrl.pathname.startsWith('/verify')
      const isApiAuthRoute = nextUrl.pathname.startsWith('/api/auth')
      const isCronRoute = nextUrl.pathname.startsWith('/api/cron')
      const isAdminRoute = nextUrl.pathname.startsWith('/api/admin')

      // Allow internal agent → API calls authenticated via Bearer token
      const internalKey = process.env.INTERNAL_API_KEY
      const authHeader = headers.get('authorization') ?? ''
      const isInternalApiCall = internalKey && authHeader === `Bearer ${internalKey}`

      if (isCronRoute || isApiAuthRoute || isAdminRoute || isInternalApiCall) return true

      if (isAuthRoute) {
        if (isLoggedIn) return Response.redirect(new URL('/leagues', nextUrl))
        return true
      }

      if (!isLoggedIn) return false
      return true
    },
  },
  providers: [], // populated in auth.ts
  session: { strategy: 'jwt' },
}
