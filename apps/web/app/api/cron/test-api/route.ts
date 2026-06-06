import { NextRequest, NextResponse } from 'next/server'
import { fetchAllFixtures } from '@/lib/football-api'

export async function GET(req: NextRequest) {
  try {
    console.log('[CRON-TEST] Testing Football API...')
    const fixtures = await fetchAllFixtures()
    console.log('[CRON-TEST] Fixtures fetched:', Array.isArray(fixtures) ? fixtures.length : 'not an array')

    if (!Array.isArray(fixtures)) {
      return NextResponse.json({
        error: 'API did not return an array',
        data: fixtures,
        type: typeof fixtures
      })
    }

    return NextResponse.json({
      ok: true,
      count: fixtures.length,
      sample: fixtures.slice(0, 2).map((f: any) => ({
        id: f.fixture?.id,
        date: f.fixture?.date,
        home: f.teams?.home?.name,
        away: f.teams?.away?.name,
        round: f.league?.round,
        status: f.fixture?.status?.short
      }))
    })
  } catch (err: any) {
    console.error('[CRON-TEST] Error:', err)
    return NextResponse.json({
      error: err.message,
      stack: err.stack
    }, { status: 500 })
  }
}
