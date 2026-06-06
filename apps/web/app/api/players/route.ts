import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, PlayerModel } from '@worldcup26/db'

export async function GET(req: NextRequest) {
  const { user, error } = await getAuthUser()
  if (error) return error

  await connectDB()

  const searchParams = req.nextUrl.searchParams
  const team = searchParams.get('team')
  const position = searchParams.get('position')
  const search = searchParams.get('search')
  const limit = parseInt(searchParams.get('limit') ?? '50', 10)
  const skip = parseInt(searchParams.get('skip') ?? '0', 10)

  // Build query
  const query: Record<string, any> = {}

  if (team) {
    // Case-insensitive team search
    query.team = { $regex: team, $options: 'i' }
  }

  if (position) {
    // Validate position
    if (['GK', 'DEF', 'MID', 'FWD'].includes(position)) {
      query.position = position
    }
  }

  if (search) {
    // Search in player name and team
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { team: { $regex: search, $options: 'i' } },
    ]
  }

  try {
    const [players, total] = await Promise.all([
      PlayerModel.find(query)
        .select('apiPlayerId name team position shirtNumber nationality marketValue photoUrl stats')
        .sort({ team: 1, position: 1, 'stats.goals': -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      PlayerModel.countDocuments(query),
    ])

    return NextResponse.json({
      ok: true,
      data: {
        players: players.map((p: any) => ({
          id: p._id.toString(),
          apiPlayerId: p.apiPlayerId,
          name: p.name,
          team: p.team,
          position: p.position,
          shirtNumber: p.shirtNumber,
          nationality: p.nationality,
          marketValue: p.marketValue,
          photoUrl: p.photoUrl,
          stats: p.stats,
        })),
        total,
        limit,
        skip,
        hasMore: skip + players.length < total,
      },
    })
  } catch (err) {
    console.error('Failed to fetch players:', err)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch players' },
      { status: 500 }
    )
  }
}
