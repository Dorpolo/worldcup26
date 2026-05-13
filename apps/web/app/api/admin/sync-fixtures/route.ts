import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB, UserModel, MembershipModel, LeagueModel, MatchModel } from '@worldcup26/db'
import { fetchAllFixtures } from '@/lib/football-api'
import { subMinutes } from 'date-fns'

// Owner-authenticated fixture sync — avoids exposing CRON_SECRET to the client
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  const user = await UserModel.findOne({ email: session.user.email }).lean() as any
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Must be an owner of at least one league
  const ownerMembership = await MembershipModel.findOne({ userId: user._id, role: 'owner' }).lean()
  if (!ownerMembership) {
    return NextResponse.json({ error: 'Only league owners can sync fixtures' }, { status: 403 })
  }

  const fixtures = await fetchAllFixtures() as any[]
  let synced = 0

  for (const fixture of fixtures) {
    const f = fixture.fixture
    const teams = fixture.teams
    const goals = fixture.goals

    const kickoffAt = new Date(f.date)
    const lockAt = subMinutes(kickoffAt, 15)
    const stage = mapStage(fixture.league?.round ?? '')

    await MatchModel.findOneAndUpdate(
      { apiMatchId: String(f.id) },
      {
        $set: {
          apiMatchId: String(f.id),
          stage,
          group: extractGroup(fixture.league?.round ?? ''),
          round: fixture.league?.round ?? '',
          homeTeam: {
            apiId: String(teams.home.id),
            name: teams.home.name,
            shortName: teams.home.name.slice(0, 3).toUpperCase(),
            logo: teams.home.logo ?? '',
            flag: '',
          },
          awayTeam: {
            apiId: String(teams.away.id),
            name: teams.away.name,
            shortName: teams.away.name.slice(0, 3).toUpperCase(),
            logo: teams.away.logo ?? '',
            flag: '',
          },
          kickoffAt,
          lockAt,
          status: mapStatus(f.status?.short ?? ''),
          ...(goals?.home != null && goals?.away != null ? {
            result: {
              homeScore: goals.home,
              awayScore: goals.away,
              winner: teams.home.winner ? String(teams.home.id) : teams.away.winner ? String(teams.away.id) : null,
              isAfterExtraTime: f.status?.short === 'AET',
              isAfterPenalties: f.status?.short === 'PEN',
            },
          } : {}),
          venue: f.venue?.name ?? '',
          city: f.venue?.city ?? '',
        },
      },
      { upsert: true }
    )
    synced++
  }

  return NextResponse.json({ ok: true, synced })
}

function mapStatus(short: string): string {
  const map: Record<string, string> = {
    NS: 'scheduled', '1H': 'live', HT: 'live', '2H': 'live',
    ET: 'live', P: 'live', FT: 'finished', AET: 'finished',
    PEN: 'finished', PST: 'postponed',
  }
  return map[short] ?? 'scheduled'
}

function mapStage(round: string): string {
  const r = round.toLowerCase()
  if (r.includes('group')) return 'group'
  if (r.includes('round of 16')) return 'round_of_16'
  if (r.includes('quarter')) return 'quarter_final'
  if (r.includes('semi')) return 'semi_final'
  if (r.includes('3rd')) return 'third_place'
  if (r.includes('final')) return 'final'
  return 'group'
}

function extractGroup(round: string): string | undefined {
  const match = round.match(/Group ([A-Z])/i)
  return match ? match[1].toUpperCase() : undefined
}
