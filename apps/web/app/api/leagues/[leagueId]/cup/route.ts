import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, MembershipModel, CupBracketModel } from '@worldcup26/db'

interface Params { params: { leagueId: string } }

export async function GET(req: NextRequest, { params }: Params) {
  const { user, error } = await getAuthUser(req)
  if (error) return error

  await connectDB()

  if (!(user as any).isInternal) {
    const membership = await MembershipModel.findOne({
      leagueId: params.leagueId,
      userId: (user as any)._id,
    }).lean()
    if (!membership) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  const bracket = await CupBracketModel.findOne({ leagueId: params.leagueId }).lean()
  return NextResponse.json({ ok: true, data: bracket })
}
