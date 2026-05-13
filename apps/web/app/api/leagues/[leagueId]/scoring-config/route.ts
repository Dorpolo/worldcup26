import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, LeagueModel, MembershipModel } from '@worldcup26/db'

interface Params { params: { leagueId: string } }

const ScoringConfigSchema = z.object({
  groupStage: z.object({
    exactScore: z.number().int().min(0).max(20),
    correctResult: z.number().int().min(0).max(20),
  }),
  knockoutStage: z.object({
    exactScore: z.number().int().min(0).max(20),
    correctResult: z.number().int().min(0).max(20),
    correctTeamAdvancing: z.number().int().min(0).max(20),
  }),
  bonuses: z.object({
    tournamentWinner: z.object({ enabled: z.boolean(), points: z.number().int().min(0).max(100) }),
    topScorer: z.object({ enabled: z.boolean(), points: z.number().int().min(0).max(100) }),
    topAssist: z.object({ enabled: z.boolean(), points: z.number().int().min(0).max(100) }),
    custom: z.array(z.object({
      _id: z.string(),
      label: z.string().max(60),
      description: z.string().max(200),
      points: z.number().int().min(0).max(100),
    })).default([]),
  }),
})

export async function GET(_req: NextRequest, { params }: Params) {
  const { user, error } = await getAuthUser()
  if (error) return error

  await connectDB()
  const league = await LeagueModel.findById(params.leagueId).select('scoringConfig').lean() as any
  if (!league) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })

  return NextResponse.json({ ok: true, data: league.scoringConfig })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { user, error } = await getAuthUser()
  if (error) return error

  await connectDB()

  const ownership = await MembershipModel.findOne({
    leagueId: params.leagueId,
    userId: (user as any)._id,
    role: 'owner',
  }).lean() as any
  if (!ownership) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const parsed = ScoringConfigSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 })
  }

  const league = await LeagueModel.findByIdAndUpdate(
    params.leagueId,
    { $set: { scoringConfig: parsed.data } },
    { new: true, lean: true }
  )

  return NextResponse.json({ ok: true, data: (league as any)?.scoringConfig })
}
