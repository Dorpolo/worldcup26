import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { addDays } from 'date-fns'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, LeagueModel, MembershipModel } from '@worldcup26/db'
import { cacheInviteToken } from '@/lib/redis'

interface Params {
  params: { leagueId: string }
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { user, error } = await getAuthUser()
  if (error) return error

  await connectDB()
  const membership = await MembershipModel.findOne({
    leagueId: params.leagueId,
    userId: (user as any)._id,
    role: 'owner',
  }).lean()

  if (!membership) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

  const token = nanoid(32)
  const expiresAt = addDays(new Date(), 7)

  await LeagueModel.findByIdAndUpdate(params.leagueId, {
    $push: {
      inviteTokens: { token, expiresAt, usedBy: [] },
    },
  })

  // Cache for fast lookup on join
  await cacheInviteToken(token, params.leagueId, expiresAt)

  const inviteUrl = `${process.env.NEXTAUTH_URL}/join/${token}`

  return NextResponse.json({ ok: true, data: { token, inviteUrl, expiresAt } }, { status: 201 })
}
