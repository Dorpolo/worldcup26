import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, LeagueModel, MembershipModel } from '@worldcup26/db'
import { slugify } from '@/lib/utils'
import { DEFAULT_SCORING_CONFIG } from '@worldcup26/types'

const CreateLeagueSchema = z.object({
  name: z.string().min(2).max(60).trim(),
  description: z.string().max(200).default(''),
  avatar: z.string().url().optional(),
})

export async function GET() {
  const { user, error } = await getAuthUser()
  if (error) return error

  await connectDB()
  const memberships = await MembershipModel.find({ userId: (user as any)._id })
    .populate('leagueId')
    .lean()

  const leagues = memberships.map((m) => ({
    ...(m.leagueId as any),
    myRank: m.rank,
    myPoints: m.totalPoints,
    myRole: m.role,
  }))

  return NextResponse.json({ ok: true, data: leagues })
}

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser()
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const parsed = CreateLeagueSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()

  const baseSlug = slugify(parsed.data.name)
  // Ensure slug uniqueness by appending nanoid if needed
  let slug = baseSlug
  const existing = await LeagueModel.findOne({ slug }).lean()
  if (existing) slug = `${baseSlug}-${nanoid(6)}`

  const league = await LeagueModel.create({
    name: parsed.data.name,
    description: parsed.data.description,
    avatar: parsed.data.avatar ?? '',
    slug,
    ownerId: (user as any)._id,
    scoringConfig: DEFAULT_SCORING_CONFIG,
    memberCount: 1,
  })

  // Create owner membership
  await MembershipModel.create({
    userId: (user as any)._id,
    leagueId: league._id,
    role: 'owner',
    rank: 1,
  })

  return NextResponse.json({ ok: true, data: league }, { status: 201 })
}
