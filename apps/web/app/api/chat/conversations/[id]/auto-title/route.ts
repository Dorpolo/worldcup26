import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, ConversationModel, UserModel } from '@worldcup26/db'

// Cheapest, fastest model — only used for short title generation
const TITLE_MODEL = 'claude-3-haiku-20240307'

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

  await connectDB()

  // Verify ownership
  const conversation = await ConversationModel.findOne({
    _id: params.id,
    userId: (user as any)._id,
  })
  if (!conversation) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
  }

  // Resolve API key: prefer user's own key, fall back to server key
  const dbUser = await UserModel.findById((user as any)._id).select('aiApiKey').lean() as any
  const apiKey = dbUser?.aiApiKey || process.env.ANTHROPIC_API_KEY

  // Function to extract a smart title from message text
  function extractSmartTitle(text: string): string {
    // Remove common question marks and clean up
    const cleaned = text.trim().replace(/^[\s?!]+|[\s?!]+$/g, '')

    // Take first 40 characters or up to first sentence
    const firstSentence = cleaned.split(/[.!?]/)[0]
    const title = firstSentence.slice(0, 40).trim()

    return title || 'New conversation'
  }

  // If no API key, generate title from message content
  if (!apiKey) {
    const title = extractSmartTitle(parsed.data.firstMessage)
    await ConversationModel.findByIdAndUpdate(params.id, { $set: { title } })
    return NextResponse.json({ ok: true, title })
  }

  try {
    const client = new Anthropic({ apiKey })
    const msg = await client.messages.create({
      model: TITLE_MODEL,
      max_tokens: 12,
      messages: [
        {
          role: 'user',
          content: parsed.data.firstResponse
            ? `Give this chat a title: 2–4 words, no punctuation, no quotes.\n` +
              `User: ${parsed.data.firstMessage.slice(0, 150)}\n` +
              `Reply: ${parsed.data.firstResponse.slice(0, 150)}`
            : `Give this chat a title from the user's message: 2–4 words, no punctuation, no quotes.\n` +
              `User message: ${parsed.data.firstMessage.slice(0, 150)}`,
        },
      ],
    })

    const raw = (msg.content[0] as any)?.text ?? ''
    const title = raw.trim().replace(/^["']|["']$/g, '').slice(0, 40) || 'New conversation'

    await ConversationModel.findByIdAndUpdate(params.id, { $set: { title } })

    return NextResponse.json({ ok: true, title })
  } catch {
    // Fall back to smart extraction on API error
    const title = extractSmartTitle(parsed.data.firstMessage)
    await ConversationModel.findByIdAndUpdate(params.id, { $set: { title } })
    return NextResponse.json({ ok: true, title })
  }
}
