import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, SkillModel } from '@worldcup26/db'

const UpdateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(300).optional(),
  type: z.enum(['instruction', 'tool']).optional(),
  prompt: z.string().min(1).max(4000).optional(),
  icon: z.string().max(8).optional(),
  tags: z.array(z.string().max(30)).max(5).optional(),
  enabled: z.boolean().optional(),
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
  const skill = await SkillModel.findOneAndUpdate(
    { _id: params.id, userId: (user as any)._id },
    { $set: parsed.data },
    { new: true, lean: true }
  )

  if (!skill) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, data: skill })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await getAuthUser()
  if (error) return error

  await connectDB()
  const deleted = await SkillModel.findOneAndDelete({
    _id: params.id,
    userId: (user as any)._id,
  })

  if (!deleted) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
