import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/auth-helpers'

// Triggers the sync-matches cron internally — dev/admin use only
export async function POST(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  const res = await fetch(`${baseUrl}/api/cron/sync-matches`, {
    method: 'POST',
    headers: { 'x-cron-secret': process.env.CRON_SECRET! },
  })

  const data = await res.json()
  return NextResponse.json(data)
}
