import { NextRequest, NextResponse } from 'next/server'
import { connectDB, PlayerModel } from '@worldcup26/db'
import { fetchPlayers } from '@/lib/football-api'

// Sync player roster from football API to database
// Called daily to keep player data fresh
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || token !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  try {
    // Fetch all teams first to get team roster
    const teamsResponse = await fetch(
      `${process.env.API_FOOTBALL_BASE_URL}/teams?league=1&season=2026`,
      {
        headers: {
          'x-apisports-key': process.env.API_FOOTBALL_KEY || '',
        },
      }
    )

    if (!teamsResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch teams: ${teamsResponse.status}` },
        { status: teamsResponse.status }
      )
    }

    const teamsData = (await teamsResponse.json()) as any
    const teams = teamsData.response || []

    let synced = 0
    let updated = 0
    let failed = 0

    // Fetch players for each team
    for (const team of teams) {
      try {
        const teamId = team.team?.id
        if (!teamId) continue

        const playersData = await fetchPlayers(teamId)
        const playersList = Array.isArray(playersData) ? playersData : []

        for (const playerData of playersList as any[]) {
          try {
            const p = playerData.player || {}
            const stats = playerData.statistics?.[0] || {}

            const playerRecord = {
              apiPlayerId: String(p.id),
              name: p.name,
              team: team.team?.name || '',
              position: mapPosition(stats.games?.position),
              shirtNumber: stats.games?.number,
              height: p.height ? parseFloat(p.height) : undefined,
              weight: p.weight ? parseFloat(p.weight) : undefined,
              birthDate: p.birth?.date ? new Date(p.birth.date) : undefined,
              nationality: p.nationality,
              marketValue: stats.games?.rating ? stats.games.rating * 1000000 : undefined,
              photoUrl: p.photo,
              apiSource: 'football-data.org',
              stats: {
                appearances: stats.games?.appearences || 0,
                goals: stats.goals?.total || 0,
                assists: stats.goals?.assists || 0,
                yellowCards: stats.cards?.yellow || 0,
                redCards: stats.cards?.red || 0,
              },
              lastUpdated: new Date(),
            }

            const result = await PlayerModel.findOneAndUpdate(
              { apiPlayerId: playerRecord.apiPlayerId },
              { $set: playerRecord },
              { upsert: true, new: true }
            )

            if (result.isNew || !result._id) {
              synced++
            } else {
              updated++
            }
          } catch (playerErr) {
            console.error(`Failed to sync player ${playerData.player?.name}:`, playerErr)
            failed++
          }
        }
      } catch (teamErr) {
        console.error(`Failed to sync team ${team.team?.name}:`, teamErr)
        failed++
      }
    }

    return NextResponse.json({
      ok: true,
      synced,
      updated,
      failed,
      message: `Synced ${synced} new players, updated ${updated}, failed ${failed}`,
    })
  } catch (err) {
    console.error('Failed to sync players:', err)
    return NextResponse.json(
      { error: 'Failed to sync players', details: String(err) },
      { status: 500 }
    )
  }
}

/**
 * Map position from API format to standard abbreviations.
 */
function mapPosition(apiPosition?: string): string {
  if (!apiPosition) return 'FWD'
  const pos = apiPosition.toUpperCase()
  if (pos.includes('GK')) return 'GK'
  if (pos.includes('D')) return 'DEF'
  if (pos.includes('M')) return 'MID'
  if (pos.includes('F') || pos.includes('W')) return 'FWD'
  return 'FWD'
}
