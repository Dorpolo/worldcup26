import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, SkillModel } from '@worldcup26/db'

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await getAuthUser()
  if (error) return error

  await connectDB()
  const skill = await SkillModel.findOne({ _id: params.id, userId: (user as any)._id })
  if (!skill) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
  }

  skill.enabled = !skill.enabled
  await skill.save()

  return NextResponse.json({ ok: true, data: { enabled: skill.enabled } })
}
