import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, MembershipModel } from '@worldcup26/db'
import { fetchStandings } from '@/lib/football-api'

interface Params {
  params: { leagueId: string }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { user, error } = await getAuthUser()
  if (error) return error

  await connectDB()

  // Verify user is a member of the league
  const membership = await MembershipModel.findOne({
    leagueId: params.leagueId,
    userId: String((user as any)._id),
  }).lean()

  if (!membership) {
    return NextResponse.json(
      { ok: false, error: 'Forbidden' },
      { status: 403 }
    )
  }

  try {
    const standings = await fetchStandings()

    // Transform raw API data into more useful format
    // Organize by groups and provide qualification zones
    const transformed = transformStandings(standings as any)

    return NextResponse.json({ ok: true, data: transformed })
  } catch (err) {
    console.error('Failed to fetch standings:', err)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch standings' },
      { status: 500 }
    )
  }
}

/**
 * Transform raw API standings data into frontend-friendly format.
 * Groups teams by group and adds qualification information.
 */
function transformStandings(rawStandings: any) {
  if (!Array.isArray(rawStandings)) {
    return { groups: {}, knockout: null }
  }

  const groups: Record<string, any[]> = {}

  // Process each group
  for (const standing of rawStandings) {
    const group = standing.group
    if (!group) continue

    if (!groups[group]) {
      groups[group] = []
    }

    // Add standings info for each team
    for (const teamStanding of standing.standings?.[0]?.table || []) {
      groups[group].push({
        rank: teamStanding.position,
        team: {
          id: teamStanding.team?.id,
          name: teamStanding.team?.name,
          logo: teamStanding.team?.logo,
          crest: teamStanding.team?.crest,
        },
        playedGames: teamStanding.playedGames,
        won: teamStanding.won,
        draw: teamStanding.draw,
        lost: teamStanding.lost,
        points: teamStanding.points,
        goalsFor: teamStanding.goalsFor,
        goalsAgainst: teamStanding.goalsDifference + teamStanding.goalsAgainst,
        goalDifference: teamStanding.goalDifference,
        qualificationZone: getQualificationZone(teamStanding.position),
      })
    }
  }

  // Sort each group by ranking
  for (const group in groups) {
    groups[group].sort((a, b) => a.rank - b.rank)
  }

  return { groups, lastUpdated: new Date() }
}

/**
 * Determine qualification zone based on position in group.
 * In World Cup 2026 group stage:
 * - Position 1-2: Qualify to Round of 16
 * - Position 3: Might qualify as one of best 3rd-place teams
 * - Position 4: Eliminated
 */
function getQualificationZone(position: number): string {
  if (position <= 2) return 'qualify'
  if (position === 3) return 'best_third'
  return 'eliminated'
}
