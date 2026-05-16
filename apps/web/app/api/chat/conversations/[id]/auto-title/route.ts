import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, ConversationModel } from '@worldcup26/db'

const TitleSchema = z.object({
  firstMessage: z.string().max(400),
  firstResponse: z.string().max(400),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await getAuthUser()
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const parsed = TitleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 })
  }

  // Verify ownership
  await connectDB()
  const conversation = await ConversationModel.findOne({
    _id: params.id,
    userId: (user as any)._id,
  })
  if (!conversation) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
  }

  const agentUrl = process.env.RAILWAY_AGENT_URL
  if (!agentUrl) {
    return NextResponse.json({ ok: true, title: 'New conversation' })
  }

  try {
    const res = await fetch(`${agentUrl}/chat/title`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`,
      },
      body: JSON.stringify({
        user_id: String((user as any)._id),
        league_id: String(conversation.leagueId),
        first_message: parsed.data.firstMessage,
        first_response: parsed.data.firstResponse,
      }),
    })

    const data = await res.json()
    const title = data.title ?? 'New conversation'

    await ConversationModel.findByIdAndUpdate(params.id, { $set: { title } })

    return NextResponse.json({ ok: true, title })
  } catch {
    return NextResponse.json({ ok: true, title: 'New conversation' })
  }
}
