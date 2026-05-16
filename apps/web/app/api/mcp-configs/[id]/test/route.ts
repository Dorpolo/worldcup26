import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, MCPConfigModel } from '@worldcup26/db'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await getAuthUser()
  if (error) return error

  await connectDB()
  const config = await MCPConfigModel.findOne({
    _id: params.id,
    userId: (user as any)._id,
  }).lean() as any

  if (!config) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
  }

  const headers: Record<string, string> = {}
  for (const h of config.headers ?? []) {
    if (h.key) headers[h.key] = h.value
  }

  try {
    const url = config.url.replace(/\/$/, '')
    const res = await fetch(`${url}/tools/list`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...headers },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      await MCPConfigModel.findByIdAndUpdate(params.id, {
        $set: { lastTestedAt: new Date(), toolCount: 0 },
      })
      return NextResponse.json({ ok: false, error: `Server returned ${res.status}` })
    }

    const data = await res.json()
    const tools: { name: string; description: string }[] = data.tools ?? []

    await MCPConfigModel.findByIdAndUpdate(params.id, {
      $set: { lastTestedAt: new Date(), toolCount: tools.length },
    })

    return NextResponse.json({ ok: true, tools })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message ?? 'Connection failed' })
  }
}
