import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/auth-helpers'
import { connectDB, MatchModel } from '@worldcup26/db'
import { fetchAllFixtures } from '@/lib/football-api'
import { subMinutes } from 'date-fns'

export async function POST(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  const fixtures = await fetchAllFixtures() as any[]
  let upserted = 0

  for (const fixture of fixtures) {
    const f = fixture.fixture
    const teams = fixture.teams
    const goals = fixture.goals

    const kickoffAt = new Date(f.date)
    const lockAt = subMinutes(kickoffAt, 15)

    const stage = mapApiStageToInternal(fixture.league?.round ?? '')

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
          status: mapApiStatus(f.status?.short ?? ''),
          ...(goals?.home != null && goals?.away != null
            ? {
                result: {
                  homeScore: goals.home,
                  awayScore: goals.away,
                  winner: teams.home.winner
                    ? String(teams.home.id)
                    : teams.away.winner
                      ? String(teams.away.id)
                      : null,
                  isAfterExtraTime: f.status?.short === 'AET',
                  isAfterPenalties: f.status?.short === 'PEN',
                },
              }
            : {}),
          venue: f.venue?.name ?? '',
          city: f.venue?.city ?? '',
        },
      },
      { upsert: true }
    )
    upserted++
  }

  return NextResponse.json({ ok: true, data: { upserted } })
}

function mapApiStatus(short: string): string {
  const map: Record<string, string> = {
    NS: 'scheduled',
    '1H': 'live',
    HT: 'live',
    '2H': 'live',
    ET: 'live',
    P: 'live',
    FT: 'finished',
    AET: 'finished',
    PEN: 'finished',
    PST: 'postponed',
  }
  return map[short] ?? 'scheduled'
}

function mapApiStageToInternal(round: string): string {
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
