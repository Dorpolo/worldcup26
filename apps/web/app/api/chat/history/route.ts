import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, ChatMessageModel } from '@worldcup26/db'

export async function GET(req: NextRequest) {
  const { user, error } = await getAuthUser()
  if (error) return error

  const leagueId = req.nextUrl.searchParams.get('leagueId')
  const conversationId = req.nextUrl.searchParams.get('conversationId') ?? ''
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10)

  if (!leagueId) {
    return NextResponse.json({ ok: false, error: 'leagueId required' }, { status: 400 })
  }

  await connectDB()

  const query = conversationId
    ? { conversationId }
    : { userId: (user as any)._id, leagueId }

  const messages = await ChatMessageModel.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean() as any[]

  return NextResponse.json({
    ok: true,
    data: messages.reverse().map((m) => ({
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
  })
}
