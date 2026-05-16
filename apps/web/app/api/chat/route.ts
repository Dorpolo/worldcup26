import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, UserModel } from '@worldcup26/db'

const MentionSchema = z.object({
  type: z.enum(['user', 'match', 'page']),
  id: z.string(),
  label: z.string(),
  meta: z.record(z.unknown()).default({}),
})

const AIConfigSchema = z.object({
  model: z.enum(['claude-haiku', 'claude-sonnet', 'gpt-4o-mini']).default('claude-haiku'),
  temperature: z.number().min(0).max(1).default(0.7),
  systemNote: z.string().max(500).default(''),
}).optional()

const ChatSchema = z.object({
  message: z.string().max(2000).default(''),
  leagueId: z.string().min(1),
  conversationId: z.string().default(''),
  mentions: z.array(MentionSchema).default([]),
  aiConfig: AIConfigSchema,
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

  // Fetch user's personal AI key if set
  await connectDB()
  const fullUser = await UserModel.findById((user as any)._id).lean() as any
  const userAiKey = fullUser?.aiApiKey ?? ''

  // Build mention context appended to the message
  const { mentions } = parsed.data
  const mentionContext = mentions.length > 0
    ? '\n\n[Mentioned context — use these IDs when calling tools]\n' + mentions.map((m) => {
        if (m.type === 'user') {
          const rank = (m.meta as any).rank
          const pts = (m.meta as any).points ?? (m.meta as any).totalPoints ?? 0
          return `@${m.label} → user_id: ${m.id}${rank ? ` (Rank #${rank}, ${pts} pts)` : ''}`
        }
        if (m.type === 'match') {
          const home = (m.meta as any).homeTeam ?? (m.meta as any).home ?? ''
          const away = (m.meta as any).awayTeam ?? (m.meta as any).away ?? ''
          const status = (m.meta as any).status ?? ''
          return `@${m.label} → match_id: ${m.id}${home ? ` (${home} vs ${away}, ${status})` : ''}`
        }
        if (m.type === 'page') {
          return `@${m.label} → context: ${m.meta.description ?? m.id}`
        }
        return `@${m.label} → id: ${m.id}`
      }).join('\n')
    : ''

  const enrichedMessage = (parsed.data.message || `Tell me about ${mentions.map((m) => m.label).join(' and ')}`) + mentionContext

  const { aiConfig } = parsed.data

  const agentRes = await fetch(`${agentUrl}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`,
      ...(userAiKey ? { 'X-User-AI-Key': userAiKey } : {}),
    },
    body: JSON.stringify({
      user_id: String((user as any)._id),
      league_id: parsed.data.leagueId,
      conversation_id: parsed.data.conversationId,
      message: enrichedMessage,
      model: aiConfig?.model ?? 'claude-haiku',
      temperature: aiConfig?.temperature ?? 0.7,
      system_note: aiConfig?.systemNote ?? '',
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
