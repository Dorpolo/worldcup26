import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, ConversationModel, ChatMessageModel } from '@worldcup26/db'

const UpdateSchema = z.object({
  title: z.string().min(1).max(80),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await getAuthUser()
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()
  const conversation = await ConversationModel.findOneAndUpdate(
    { _id: params.id, userId: (user as any)._id },
    { $set: { title: parsed.data.title } },
    { new: true, lean: true }
  )

  if (!conversation) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, data: conversation })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await getAuthUser()
  if (error) return error

  await connectDB()
  const conversation = await ConversationModel.findOneAndDelete({
    _id: params.id,
    userId: (user as any)._id,
  })

  if (!conversation) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
  }

  // Cascade delete messages
  await ChatMessageModel.deleteMany({ conversationId: params.id })

  return NextResponse.json({ ok: true })
}
