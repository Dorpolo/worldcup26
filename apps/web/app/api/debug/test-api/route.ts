import { NextResponse } from 'next/server'
import { fetchAllFixtures } from '@/lib/football-api'

// Disable auth for this debug endpoint
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('[TEST-API] Testing Football API...')
    const fixtures = await fetchAllFixtures()
    console.log('[TEST-API] Fixtures fetched:', Array.isArray(fixtures) ? fixtures.length : 'not an array')

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
    console.error('[TEST-API] Error:', err)
    return NextResponse.json({
      error: err.message,
      stack: err.stack
    }, { status: 500 })
  }
}
