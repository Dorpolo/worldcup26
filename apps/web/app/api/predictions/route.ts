import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, MatchModel, PredictionModel } from '@worldcup26/db'
import { checkRateLimit } from '@/lib/redis'
import { isMatchLocked } from '@/lib/utils'

const PredictionSchema = z.object({
  matchId: z.string().min(1),
  leagueId: z.string().min(1),
  homeScore: z.number().int().min(0).max(30),
  awayScore: z.number().int().min(0).max(30),
})

export async function GET(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error) return error

  const { searchParams } = new URL(req.url)
  const leagueId = searchParams.get('leagueId')
  const matchId = searchParams.get('matchId')

  await connectDB()

  const query: Record<string, string> = { userId: String((user as any)._id) }
  if (leagueId) query.leagueId = leagueId
  if (matchId) query.matchId = matchId

  const predictions = await PredictionModel.find(query).lean() as any
  return NextResponse.json({ ok: true, data: predictions })
}

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error) return error

  const userId = String((user as any)._id)

  // Rate limit: max 10 prediction submissions per minute
  const allowed = await checkRateLimit(userId, 'predict', 10, 60)
  if (!allowed) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = PredictionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()

  const match = await MatchModel.findById(parsed.data.matchId).lean() as any
  if (!match) return NextResponse.json({ ok: false, error: 'Match not found' }, { status: 404 })

  if (isMatchLocked(match.lockAt)) {
    return NextResponse.json(
      { ok: false, error: 'Predictions are locked for this match' },
      { status: 409 }
    )
  }

  const prediction = await PredictionModel.findOneAndUpdate(
    { userId, matchId: parsed.data.matchId, leagueId: parsed.data.leagueId },
    {
      $set: {
        homeScore: parsed.data.homeScore,
        awayScore: parsed.data.awayScore,
        submittedAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  return NextResponse.json({ ok: true, data: prediction }, { status: 201 })
}
