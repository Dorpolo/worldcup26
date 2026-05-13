import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, BonusPredictionModel, MembershipModel, MatchModel } from '@worldcup26/db'

interface Params { params: { leagueId: string } }

const BonusSchema = z.object({
  type: z.enum(['tournament_winner', 'top_scorer', 'top_assist', 'custom']),
  customBonusId: z.string().optional(),
  value: z.string().min(1),
  valueLabel: z.string().min(1),
})

export async function GET(_req: NextRequest, { params }: Params) {
  const { user, error } = await getAuthUser()
  if (error) return error

  await connectDB()

  const membership = await MembershipModel.findOne({
    leagueId: params.leagueId,
    userId: (user as any)._id,
  }).lean() as any
  if (!membership) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

  const predictions = await BonusPredictionModel.find({
    userId: (user as any)._id,
    leagueId: params.leagueId,
  }).lean() as any

  return NextResponse.json({ ok: true, data: predictions })
}

export async function POST(req: NextRequest, { params }: Params) {
  const { user, error } = await getAuthUser()
  if (error) return error

  await connectDB()

  const membership = await MembershipModel.findOne({
    leagueId: params.leagueId,
    userId: (user as any)._id,
  }).lean() as any
  if (!membership) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const parsed = BonusSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 })
  }

  // Bonus predictions lock when the first match starts
  const firstMatch = await MatchModel.findOne({}).sort({ kickoffAt: 1 }).lean() as any
  if (firstMatch && new Date() >= new Date(firstMatch.kickoffAt)) {
    return NextResponse.json(
      { ok: false, error: 'Bonus predictions are locked — the tournament has started' },
      { status: 409 }
    )
  }

  const prediction = await BonusPredictionModel.findOneAndUpdate(
    { userId: (user as any)._id, leagueId: params.leagueId, type: parsed.data.type },
    { $set: { ...parsed.data, submittedAt: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  return NextResponse.json({ ok: true, data: prediction }, { status: 201 })
}
