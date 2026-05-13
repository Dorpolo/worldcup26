import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthRoute = req.nextUrl.pathname.startsWith('/login') ||
    req.nextUrl.pathname.startsWith('/verify')
  const isApiAuthRoute = req.nextUrl.pathname.startsWith('/api/auth')
  const isCronRoute = req.nextUrl.pathname.startsWith('/api/cron')

  // Cron routes protected by CRON_SECRET header (not session)
  if (isCronRoute) return NextResponse.next()

  // NextAuth API routes always pass
  if (isApiAuthRoute) return NextResponse.next()

  // Auth pages: redirect to home if already logged in
  if (isAuthRoute) {
    if (isLoggedIn) return NextResponse.redirect(new URL('/leagues', req.nextUrl))
    return NextResponse.next()
  }

  // All other routes require auth
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
