import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, LeagueModel, MembershipModel } from '@worldcup26/db'
import { getInviteLeagueId } from '@/lib/redis'

interface Params {
  params: { token: string }
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { user, error } = await getAuthUser()
  if (error) return error

  await connectDB()

  // Fast Redis lookup first, fallback to DB
  let leagueId = await getInviteLeagueId(params.token)
  if (!leagueId) {
    const league = await LeagueModel.findOne({
      'inviteTokens.token': params.token,
      'inviteTokens.expiresAt': { $gt: new Date() },
    }).lean()
    if (!league) {
      return NextResponse.json({ ok: false, error: 'Invalid or expired invite link' }, { status: 400 })
    }
    leagueId = String(league._id)
  }

  const userId = (user as any)._id

  // Check if already a member
  const existing = await MembershipModel.findOne({ userId, leagueId }).lean()
  if (existing) {
    const league = await LeagueModel.findById(leagueId).lean()
    return NextResponse.json({ ok: true, data: { alreadyMember: true, league } })
  }

  // Create membership + update counter
  const [, league] = await Promise.all([
    MembershipModel.create({ userId, leagueId, role: 'member', rank: 0 }),
    LeagueModel.findByIdAndUpdate(
      leagueId,
      { $inc: { memberCount: 1 } },
      { new: true, lean: true }
    ),
    // Mark token as used
    LeagueModel.updateOne(
      { _id: leagueId, 'inviteTokens.token': params.token },
      { $push: { 'inviteTokens.$.usedBy': userId } }
    ),
  ])

  return NextResponse.json({ ok: true, data: { joined: true, league } }, { status: 201 })
}
