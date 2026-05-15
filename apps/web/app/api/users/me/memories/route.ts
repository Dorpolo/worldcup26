import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, MemoryModel } from '@worldcup26/db'

const CreateSchema = z.object({
  content: z.string().min(1).max(500),
  category: z.enum(['preferences', 'league-notes', 'player-observations', 'strategy', 'personal']).default('personal'),
  leagueId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const { user, error } = await getAuthUser()
  if (error) return error

  const category = req.nextUrl.searchParams.get('category')
  const leagueId = req.nextUrl.searchParams.get('leagueId')

  await connectDB()
  const query: Record<string, unknown> = { userId: (user as any)._id }
  if (category) query.category = category
  if (leagueId) query.leagueId = leagueId

  const memories = await MemoryModel.find(query)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean()

  return NextResponse.json({ ok: true, data: memories })
}

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser()
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()
  const memory = await MemoryModel.create({
    userId: (user as any)._id,
    ...parsed.data,
    source: 'manual',
  })

  return NextResponse.json({ ok: true, data: memory }, { status: 201 })
}
