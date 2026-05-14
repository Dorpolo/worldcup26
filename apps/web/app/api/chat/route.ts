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
    // Dev fallback: echo a static response as SSE
    const stream = new ReadableStream({
      start(controller) {
        const enc = new TextEncoder()
        const msg = "The AI agent isn't configured yet (`RAILWAY_AGENT_URL` is missing). Set it up to enable chat."
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'token', content: msg })}\n\n`))
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
        controller.close()
      },
    })
    return new NextResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    })
  }

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
  }).catch(() => null)

  if (!agentRes?.ok) {
    const stream = new ReadableStream({
      start(controller) {
        const enc = new TextEncoder()
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'error', content: 'Agent unavailable. Try again later.' })}\n\n`))
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
        controller.close()
      },
    })
    return new NextResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    })
  }

  return new NextResponse(agentRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
