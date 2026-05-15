import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Types } from 'mongoose'
import { connectDB, MemoryModel } from '@worldcup26/db'

function verifyInternalKey(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return true // dev: skip if not configured
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${key}`
}

const CreateSchema = z.object({
  userId: z.string().min(1),
  content: z.string().min(1).max(500),
  category: z.enum(['preferences', 'league-notes', 'player-observations', 'strategy', 'personal']).default('personal'),
  leagueId: z.string().optional(),
  source: z.enum(['auto', 'manual']).default('auto'),
})

export async function GET(req: NextRequest) {
  if (!verifyInternalKey(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const userId  = req.nextUrl.searchParams.get('userId')
  const leagueId = req.nextUrl.searchParams.get('leagueId')
  const limit   = parseInt(req.nextUrl.searchParams.get('limit') ?? '10', 10)

  if (!userId) {
    return NextResponse.json({ ok: false, error: 'userId required' }, { status: 400 })
  }

  let userObjId: Types.ObjectId
  try { userObjId = new Types.ObjectId(userId) } catch {
    return NextResponse.json({ ok: false, error: 'Invalid userId' }, { status: 400 })
  }

  await connectDB()
  const query: Record<string, unknown> = { userId: userObjId }
  if (leagueId) {
    try { query.leagueId = new Types.ObjectId(leagueId) } catch {}
  }

  const memories = await MemoryModel.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()

  return NextResponse.json({ ok: true, data: memories })
}

export async function POST(req: NextRequest) {
  if (!verifyInternalKey(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()
  const memory = await MemoryModel.create(parsed.data)

  return NextResponse.json({ ok: true, data: memory }, { status: 201 })
}
