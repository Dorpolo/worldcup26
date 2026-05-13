import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, LeagueModel } from '@worldcup26/db'
import { generateRulesMarkdown } from '@worldcup26/config'

interface Params {
  params: { leagueId: string }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await getAuthUser()
  if (error) return error

  await connectDB()
  const league = await LeagueModel.findById(params.leagueId).lean()
  if (!league) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })

  const markdown = generateRulesMarkdown(league.name, league.scoringConfig as any)
  return NextResponse.json({ ok: true, data: { markdown } })
}
