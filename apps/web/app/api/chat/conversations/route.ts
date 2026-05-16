import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, ConversationModel } from '@worldcup26/db'

const CreateSchema = z.object({
  leagueId: z.string().min(1),
  title: z.string().max(80).default('New conversation'),
})

export async function GET(req: NextRequest) {
  const { user, error } = await getAuthUser()
  if (error) return error

  const leagueId = req.nextUrl.searchParams.get('leagueId')
  if (!leagueId) {
    return NextResponse.json({ ok: false, error: 'leagueId required' }, { status: 400 })
  }

  await connectDB()
  const conversations = await ConversationModel.find({
    userId: (user as any)._id,
    leagueId,
  })
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean()

  return NextResponse.json({ ok: true, data: conversations })
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
  const conversation = await ConversationModel.create({
    userId: (user as any)._id,
    leagueId: parsed.data.leagueId,
    title: parsed.data.title,
    messageCount: 0,
  })

  return NextResponse.json({ ok: true, data: conversation }, { status: 201 })
}
