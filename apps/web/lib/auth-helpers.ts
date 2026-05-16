import { auth } from '@/auth'
import { connectDB, UserModel } from '@worldcup26/db'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Gets the current authenticated user from the session + DB.
 * Also accepts an internal Bearer token (INTERNAL_API_KEY) for agent-to-API calls.
 * In that case the caller must pass ?userId=<objectId> as a query param.
 */
export async function getAuthUser(req?: NextRequest) {
  // Internal API key bypass (used by the Python agent tools)
  if (req) {
    const authHeader = req.headers.get('authorization') ?? ''
    const internalKey = process.env.INTERNAL_API_KEY
    if (internalKey && authHeader === `Bearer ${internalKey}`) {
      const userId = req.nextUrl.searchParams.get('userId')
      await connectDB()
      // If userId provided, load that user; otherwise return a synthetic agent user
      if (userId) {
        const user = await UserModel.findById(userId).lean()
        if (user) return { user, error: null }
      }
      // Agent calling without a specific user — return a minimal sentinel
      return {
        user: { _id: 'agent', email: 'agent@internal', name: 'Agent', isInternal: true } as any,
        error: null,
      }
    }
  }

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
