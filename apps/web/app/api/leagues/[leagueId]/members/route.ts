import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, MembershipModel, UserModel } from '@worldcup26/db'

interface Params { params: { leagueId: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const { user, error } = await getAuthUser()
  if (error) return error

  await connectDB()

  const membership = await MembershipModel.findOne({
    leagueId: params.leagueId,
    userId: (user as any)._id,
  }).lean()
  if (!membership) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

  const members = await MembershipModel.find({ leagueId: params.leagueId })
    .populate('userId', 'name avatar email')
    .sort({ totalPoints: -1 })
    .lean()

  return NextResponse.json({
    ok: true,
    data: members.map((m, i) => ({
      membershipId: String(m._id),
      userId: String((m.userId as any)._id),
      name: (m.userId as any).name,
      avatar: (m.userId as any).avatar,
      email: (m.userId as any).email,
      role: m.role,
      totalPoints: m.totalPoints,
      rank: i + 1,
      joinedAt: m.joinedAt,
    })),
  })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { user, error } = await getAuthUser()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const targetUserId = searchParams.get('userId')
  if (!targetUserId) return NextResponse.json({ ok: false, error: 'userId required' }, { status: 400 })

  await connectDB()

  const ownership = await MembershipModel.findOne({
    leagueId: params.leagueId,
    userId: (user as any)._id,
    role: 'owner',
  }).lean()
  if (!ownership) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

  // Can't remove the owner
  if (targetUserId === String((user as any)._id)) {
    return NextResponse.json({ ok: false, error: 'Cannot remove the league owner' }, { status: 400 })
  }

  await MembershipModel.deleteOne({ leagueId: params.leagueId, userId: targetUserId })

  return NextResponse.json({ ok: true })
}
