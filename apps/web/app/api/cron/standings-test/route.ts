import { NextResponse } from 'next/server'
import { fetchStandings } from '@/lib/football-api'

export async function GET() {
  try {
    console.log('[STANDINGS-TEST] Fetching standings...')
    const standings = await fetchStandings()

    console.log('[STANDINGS-TEST] Got standings data')

    return NextResponse.json({
      ok: true,
      standings: standings
    })
  } catch (err: any) {
    console.error('[STANDINGS-TEST] Error:', err)
    return NextResponse.json({
      error: err.message
    }, { status: 500 })
  }
}
