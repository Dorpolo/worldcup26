import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, MemoryModel } from '@worldcup26/db'

const UpdateSchema = z.object({
  content: z.string().min(1).max(500).optional(),
  category: z.enum(['preferences', 'league-notes', 'player-observations', 'strategy', 'personal']).optional(),
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
  const memory = await MemoryModel.findOneAndUpdate(
    { _id: params.id, userId: (user as any)._id },
    { $set: parsed.data },
    { new: true, lean: true }
  )

  if (!memory) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, data: memory })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await getAuthUser()
  if (error) return error

  await connectDB()
  const deleted = await MemoryModel.findOneAndDelete({
    _id: params.id,
    userId: (user as any)._id,
  })

  if (!deleted) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
