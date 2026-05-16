import { auth } from '@/auth'
import { connectDB, UserModel } from '@worldcup26/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ ok: false }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ ok: false, error: 'No file' }, { status: 400 })

  if (file.size > 2 * 1024 * 1024)
    return NextResponse.json({ ok: false, error: 'Max 2 MB' }, { status: 400 })
  if (!file.type.startsWith('image/'))
    return NextResponse.json({ ok: false, error: 'Images only' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')
  const dataUrl = `data:${file.type};base64,${base64}`

  await connectDB()
  await UserModel.updateOne(
    { email: session.user.email },
    { $set: { avatar: dataUrl } }
  )

  return NextResponse.json({ ok: true, avatar: dataUrl })
}
