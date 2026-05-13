import { NextRequest, NextResponse } from 'next/server'
import { addHours } from 'date-fns'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, MatchModel } from '@worldcup26/db'

export async function GET(req: NextRequest) {
  const { error } = await getAuthUser()
  if (error) return error

  await connectDB()

  const { searchParams } = new URL(req.url)
  const hours = parseInt(searchParams.get('hours') ?? '48', 10)

  const now = new Date()
  const until = addHours(now, hours)

  const matches = await MatchModel.find({
    kickoffAt: { $gte: now, $lte: until },
    status: { $in: ['scheduled', 'locked'] },
  })
    .sort({ kickoffAt: 1 })
    .lean()

  return NextResponse.json({ ok: true, data: matches })
}
