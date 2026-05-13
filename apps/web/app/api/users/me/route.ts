import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, UserModel } from '@worldcup26/db'

const UpdateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  timezone: z.string().optional(),
})

export async function GET() {
  const { user, error } = await getAuthUser()
  if (error) return error

  return NextResponse.json({ ok: true, data: user })
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await getAuthUser()
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()
  const updated = await UserModel.findByIdAndUpdate(
    (user as any)._id,
    { $set: parsed.data },
    { new: true, lean: true }
  )

  return NextResponse.json({ ok: true, data: updated })
}
