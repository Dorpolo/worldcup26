import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/auth-helpers'
import { connectDB, MatchModel, PredictionModel } from '@worldcup26/db'
import { getRedis } from '@/lib/redis'

export async function POST(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  const now = new Date()

  // Find matches whose lockAt has passed but predictions aren't yet locked
  const matchesToLock = await MatchModel.find({
    lockAt: { $lte: now },
    status: { $in: ['scheduled', 'locked'] },
  })
    .select('_id')
    .lean()

  if (matchesToLock.length === 0) {
    return NextResponse.json({ ok: true, data: { locked: 0 } })
  }

  const matchIds = matchesToLock.map((m) => m._id)

  // Mark all unlocked predictions for these matches as locked
  const result = await PredictionModel.updateMany(
    { matchId: { $in: matchIds }, isLocked: false },
    { $set: { isLocked: true } }
  )

  // Update match status to 'locked'
  await MatchModel.updateMany(
    { _id: { $in: matchIds }, status: 'scheduled' },
    { $set: { status: 'locked' } }
  )

  // Publish lock events via Redis for Socket.io to broadcast
  const r = getRedis()
  for (const matchId of matchIds) {
    await r.publish(`channel:match:${matchId}:lock`, JSON.stringify({ matchId: String(matchId), lockedAt: now }))
  }

  return NextResponse.json({ ok: true, data: { locked: result.modifiedCount } })
}
