import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, LeagueModel, MembershipModel } from '@worldcup26/db'

interface Params {
  params: { leagueId: string }
}

async function assertMembership(leagueId: string, userId: string) {
  const membership = await MembershipModel.findOne({ leagueId, userId }).lean()
  return membership
}

async function assertOwner(leagueId: string, userId: string) {
  const membership = await MembershipModel.findOne({ leagueId, userId, role: 'owner' }).lean()
  return membership
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { user, error } = await getAuthUser()
  if (error) return error

  await connectDB()
  const league = await LeagueModel.findById(params.leagueId).lean()
  if (!league) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })

  const membership = await assertMembership(params.leagueId, String((user as any)._id))
  if (!membership) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

  return NextResponse.json({ ok: true, data: league })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { user, error } = await getAuthUser()
  if (error) return error

  await connectDB()
  const membership = await assertOwner(params.leagueId, String((user as any)._id))
  if (!membership) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const allowed = ['name', 'description', 'avatar']
  const update = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  )

  const league = await LeagueModel.findByIdAndUpdate(
    params.leagueId,
    { $set: update },
    { new: true, lean: true }
  )

  return NextResponse.json({ ok: true, data: league })
}
