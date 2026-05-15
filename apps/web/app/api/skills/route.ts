import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, SkillModel } from '@worldcup26/db'

const CreateSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(300).default(''),
  type: z.enum(['instruction', 'tool']),
  prompt: z.string().min(1).max(4000),
  icon: z.string().max(8).default('⚡'),
  tags: z.array(z.string().max(30)).max(5).default([]),
  enabled: z.boolean().default(true),
})

export async function GET() {
  const { user, error } = await getAuthUser()
  if (error) return error

  await connectDB()
  const skills = await SkillModel.find({ userId: (user as any)._id })
    .sort({ createdAt: -1 })
    .lean()

  return NextResponse.json({ ok: true, data: skills })
}

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser()
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()
  const skill = await SkillModel.create({
    userId: (user as any)._id,
    ...parsed.data,
  })

  return NextResponse.json({ ok: true, data: skill }, { status: 201 })
}
