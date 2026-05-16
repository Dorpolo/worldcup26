import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, MembershipModel, CupBracketModel, UserModel } from '@worldcup26/db'
import { getCupConfig, buildCupMatchups } from '@worldcup26/config'

interface Params { params: { leagueId: string } }

export async function POST(_req: NextRequest, { params }: Params) {
  const { user, error } = await getAuthUser()
  if (error) return error

  await connectDB()

  const ownership = await MembershipModel.findOne({
    leagueId: params.leagueId,
    userId: (user as any)._id,
    role: 'owner',
  }).lean()
  if (!ownership) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

  const existing = await CupBracketModel.findOne({ leagueId: params.leagueId }).lean()
  if (existing) {
    return NextResponse.json({ ok: false, error: 'Cup draw already done' }, { status: 409 })
  }

  // Get all members, shuffle for seeding
  const members = await MembershipModel.find({ leagueId: params.leagueId })
    .sort({ totalPoints: -1 })
    .lean()

  if (members.length < 2) {
    return NextResponse.json({ ok: false, error: 'Need at least 2 members for a cup' }, { status: 400 })
  }

  // Get user names for display
  const userIds = members.map((m) => m.userId)
  const users = await UserModel.find({ _id: { $in: userIds } }).lean() as any[]
  const userMap = new Map(users.map((u) => [String(u._id), u.name]))

  const memberIds = members.map((m) => String(m.userId))
  const { startRound } = getCupConfig(memberIds.length)
  const matchupPairs = buildCupMatchups(memberIds)

  const bracket = await CupBracketModel.create({
    leagueId: params.leagueId,
    status: 'active',
    startRound,
    rounds: [
      {
        roundNumber: 1,
        roundName: formatRoundName(startRound),
        worldCupStage: cupRoundToMatchStage(startRound),
        status: 'active',
        matchups: matchupPairs.map((pair) => ({
          // omit _id — Mongoose auto-generates ObjectId
          homeUserId: pair.homeUserId,
          awayUserId: pair.awayUserId,
          homePoints: 0,
          awayPoints: 0,
          winnerId: pair.awayUserId === null ? pair.homeUserId : undefined,
          isBye: pair.awayUserId === null,
        })),
      },
    ],
  })

  return NextResponse.json({ ok: true, data: bracket }, { status: 201 })
}

function cupRoundToMatchStage(round: string): string {
  const map: Record<string, string> = {
    round_of_32: 'round_of_16',
    round_of_16: 'round_of_16',
    quarter_final: 'quarter_final',
    semi_final: 'semi_final',
    final: 'final',
  }
  return map[round] ?? round
}

function formatRoundName(round: string): string {
  const map: Record<string, string> = {
    final: 'Final',
    semi_final: 'Semi Finals',
    quarter_final: 'Quarter Finals',
    round_of_16: 'Round of 16',
    round_of_32: 'Round of 32',
  }
  return map[round] ?? round
}
