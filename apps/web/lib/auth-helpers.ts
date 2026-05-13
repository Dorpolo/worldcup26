import { auth } from '@/auth'
import { connectDB, UserModel } from '@worldcup26/db'
import { NextResponse } from 'next/server'

/**
 * Gets the current authenticated user from the session + DB.
 * Returns { user, error } — if error, return it immediately from the route handler.
 */
export async function getAuthUser() {
  const session = await auth()
  if (!session?.user?.email) {
    return {
      user: null,
      error: NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 }),
    }
  }

  await connectDB()
  const user = await UserModel.findOne({ email: session.user.email }).lean()
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 }),
    }
  }

  return { user, error: null }
}

/**
 * Validates the CRON_SECRET header for internal cron route protection.
 */
export function validateCronSecret(request: Request): boolean {
  const secret = request.headers.get('x-cron-secret')
  return secret === process.env.CRON_SECRET
}
