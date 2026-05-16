import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB, SkillModel, MCPConfigModel, MemoryModel } from '@worldcup26/db'

function verifyInternalKey(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return true
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${key}`
}

export async function GET(req: NextRequest) {
  if (!verifyInternalKey(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'userId required' }, { status: 400 })
  }

  let userObjId: Types.ObjectId
  try {
    userObjId = new Types.ObjectId(userId)
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid userId' }, { status: 400 })
  }

  await connectDB()

  const [skills, mcpConfigs, memories] = await Promise.all([
    SkillModel.find({ userId: userObjId, enabled: true }).sort({ createdAt: -1 }).lean(),
    MCPConfigModel.find({ userId: userObjId, enabled: true }).sort({ createdAt: -1 }).lean(),
    MemoryModel.find({ userId: userObjId }).sort({ createdAt: -1 }).limit(10).lean(),
  ])

  return NextResponse.json({
    ok: true,
    data: { skills, mcp_configs: mcpConfigs, memories },
  })
}
