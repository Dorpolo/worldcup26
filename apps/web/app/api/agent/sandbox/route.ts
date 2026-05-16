import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth-helpers'

const SandboxSchema = z.object({
  message: z.string().min(1).max(2000),
  leagueId: z.string().default(''),
  agentConfig: z.object({
    skills: z.array(z.any()).default([]),
    mcp_configs: z.array(z.any()).default([]),
    memories: z.array(z.any()).default([]),
  }).default({}),
})

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser()
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const parsed = SandboxSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 })
  }

  const agentUrl = process.env.RAILWAY_AGENT_URL
  if (!agentUrl) {
    const stream = new ReadableStream({
      start(controller) {
        const enc = new TextEncoder()
        const msg = 'Agent not configured (RAILWAY_AGENT_URL missing).'
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'token', content: msg })}\n\n`))
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
        controller.close()
      },
    })
    return new NextResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    })
  }

  const agentRes = await fetch(`${agentUrl}/chat/sandbox`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`,
    },
    body: JSON.stringify({
      user_id: String((user as any)._id),
      league_id: parsed.data.leagueId,
      message: parsed.data.message,
      agent_config: parsed.data.agentConfig,
    }),
  }).catch(() => null)

  if (!agentRes?.ok) {
    const stream = new ReadableStream({
      start(controller) {
        const enc = new TextEncoder()
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'error', content: 'Agent unavailable.' })}\n\n`))
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

export async function GET(req: NextRequest) {
  const { user, error } = await getAuthUser()
  if (error) return error

  const leagueId = req.nextUrl.searchParams.get('leagueId') ?? ''
  const skills = req.nextUrl.searchParams.getAll('skillIds')

  // Return a preview of the system prompt that will be used
  const preview = `## Context\n- user_id: ${(user as any)._id}\n- league_id: ${leagueId || '(none)'}\n\n## Active skills\n${skills.length ? skills.map((s) => `- ${s}`).join('\n') : '(none enabled)'}`

  return NextResponse.json({ ok: true, data: { preview } })
}
