import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, MCPConfigModel } from '@worldcup26/db'

const CreateSchema = z.object({
  name: z.string().min(1).max(80),
  url: z.string().url().max(500),
  headers: z.array(z.object({ key: z.string(), value: z.string() })).max(10).default([]),
  description: z.string().max(300).default(''),
  enabled: z.boolean().default(true),
})

export async function GET() {
  const { user, error } = await getAuthUser()
  if (error) return error

  await connectDB()
  const configs = await MCPConfigModel.find({ userId: (user as any)._id })
    .sort({ createdAt: -1 })
    .lean()

  return NextResponse.json({ ok: true, data: configs })
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
  const config = await MCPConfigModel.create({
    userId: (user as any)._id,
    ...parsed.data,
  })

  return NextResponse.json({ ok: true, data: config }, { status: 201 })
}
