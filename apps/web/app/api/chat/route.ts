import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth-helpers'

const ChatSchema = z.object({
  message: z.string().min(1).max(2000),
  leagueId: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser()
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const parsed = ChatSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 })
  }

  const agentUrl = process.env.RAILWAY_AGENT_URL
  if (!agentUrl) {
    return NextResponse.json({ ok: false, error: 'AI agent not configured' }, { status: 503 })
  }

  // Forward to Python LangGraph agent with streaming
  const agentRes = await fetch(`${agentUrl}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`,
    },
    body: JSON.stringify({
      user_id: String((user as any)._id),
      league_id: parsed.data.leagueId,
      message: parsed.data.message,
    }),
  })

  if (!agentRes.ok) {
    return NextResponse.json({ ok: false, error: 'Agent error' }, { status: 502 })
  }

  // Stream the response back
  return new NextResponse(agentRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
