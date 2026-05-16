import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, MatchModel } from '@worldcup26/db'

export async function GET(req: NextRequest) {
  const { error } = await getAuthUser(req)
  if (error) return error

  await connectDB()

  const { searchParams } = new URL(req.url)
  const stage = searchParams.get('stage')
  const status = searchParams.get('status')

  const query: Record<string, string> = {}
  if (stage) query.stage = stage
  if (status) query.status = status

  const matches = await MatchModel.find(query).sort({ kickoffAt: 1 }).lean()
  return NextResponse.json({ ok: true, data: matches })
}
