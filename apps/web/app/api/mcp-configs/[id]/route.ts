import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, MCPConfigModel } from '@worldcup26/db'

const UpdateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  url: z.string().url().max(500).optional(),
  headers: z.array(z.object({ key: z.string(), value: z.string() })).max(10).optional(),
  description: z.string().max(300).optional(),
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
  const config = await MCPConfigModel.findOneAndUpdate(
    { _id: params.id, userId: (user as any)._id },
    { $set: parsed.data },
    { new: true, lean: true }
  )

  if (!config) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, data: config })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await getAuthUser()
  if (error) return error

  await connectDB()
  const deleted = await MCPConfigModel.findOneAndDelete({
    _id: params.id,
    userId: (user as any)._id,
  })

  if (!deleted) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
