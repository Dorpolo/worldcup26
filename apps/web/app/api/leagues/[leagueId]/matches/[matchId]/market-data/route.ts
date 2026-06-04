import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, MembershipModel, MatchModel } from '@worldcup26/db'
import { fetchMarketProbabilities, getPollyMarketUrl } from '@/lib/polly-market-api'

interface Params {
  params: { leagueId: string; matchId: string }
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
    // Fetch match details
    const match = await MatchModel.findById(params.matchId).lean() as any
    if (!match) {
      return NextResponse.json(
        { ok: false, error: 'Match not found' },
        { status: 404 }
      )
    }

    // If match is finished, no point in fetching market data
    if (match.status === 'finished') {
      return NextResponse.json({
        ok: true,
        data: {
          available: false,
          reason: 'Match is finished',
          pollyMarketUrl: getPollyMarketUrl(
            match.homeTeam?.name || '',
            match.awayTeam?.name || ''
          ),
        },
      })
    }

    // Fetch probabilities from Polly Market
    const marketData = await fetchMarketProbabilities(
      match.homeTeam?.name || '',
      match.awayTeam?.name || '',
      match.kickoffAt?.toISOString() || ''
    )

    if (!marketData) {
      // Market not found, but provide link
      return NextResponse.json({
        ok: true,
        data: {
          available: false,
          reason: 'No active market on Polly Market',
          pollyMarketUrl: getPollyMarketUrl(
            match.homeTeam?.name || '',
            match.awayTeam?.name || ''
          ),
        },
      })
    }

    return NextResponse.json({
      ok: true,
      data: {
        available: true,
        probabilities: {
          homeWin: marketData.homeWinProb,
          draw: marketData.drawProb,
          awayWin: marketData.awayWinProb,
        },
        volume: marketData.marketVolume,
        lastUpdated: marketData.lastUpdated,
        pollyMarketUrl: marketData.url,
      },
    })
  } catch (err) {
    console.error('Failed to fetch market data:', err)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch market data' },
      { status: 500 }
    )
  }
}
