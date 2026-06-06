import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB, MatchModel } from '@worldcup26/db'
import { TeamInfo } from '@worldcup26/types'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const matches = await MatchModel.find({}).lean() as any[]

    const teamsMap = new Map<string, TeamInfo>()

    for (const match of matches) {
      if (match.homeTeam) {
        teamsMap.set(match.homeTeam.apiId, match.homeTeam)
      }
      if (match.awayTeam) {
        teamsMap.set(match.awayTeam.apiId, match.awayTeam)
      }
    }

    const teams = Array.from(teamsMap.values())
      .sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ ok: true, data: teams })
  } catch (err) {
    console.error('[/api/teams] Error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch teams', details: String(err) },
      { status: 500 }
    )
  }
}
