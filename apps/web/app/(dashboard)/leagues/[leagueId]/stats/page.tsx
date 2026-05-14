import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { connectDB, UserModel, LeagueModel, MembershipModel, PredictionModel, MatchModel } from '@worldcup26/db'
import { StatsCharts } from './StatsCharts'
import { MatchDistributionPanel } from '@/components/stats/MatchDistributionPanel'
import { StatsContextTable } from './StatsContextTable'
import type { MemberSeries } from '@/components/stats/PointsProgressionChart'
import type { AccuracyEntry } from '@/components/stats/AccuracyBreakdownChart'

interface Props { params: { leagueId: string } }

export default async function StatsPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  await connectDB()

  const user = await UserModel.findOne({ email: session.user.email }).lean() as any
  if (!user) redirect('/login')

  const league = await LeagueModel.findOne({ slug: params.leagueId }).lean() as any
  if (!league) redirect('/leagues')

  const membership = await MembershipModel.findOne({ userId: user._id, leagueId: league._id }).lean() as any
  if (!membership) redirect('/leagues')

  const members = await MembershipModel.find({ leagueId: league._id })
    .populate('userId', 'name avatar')
    .sort({ totalPoints: -1 })
    .lean() as any[]

  const predictions = await PredictionModel.find({
    leagueId: league._id,
    pointsEarned: { $exists: true },
  }).lean() as any[]

  const finishedMatches = await MatchModel.find({ status: 'finished' })
    .select('_id homeTeam awayTeam kickoffAt stage group')
    .sort({ kickoffAt: 1 })
    .lean() as any[]

  const totalMatchCount = await MatchModel.countDocuments({})

  // ── Per-member stats ────────────────────────────────────────────────────
  const currentUserId = String(user._id)

  const memberStats = members.map((m: any, rank: number) => {
    const uid = String(m.userId._id)
    const preds = predictions.filter((p: any) => String(p.userId) === uid)
    const exactScores = preds.filter((p: any) => p.breakdown?.exactScore).length
    const correctResults = preds.filter((p: any) => p.breakdown?.correctResult).length
    const totalPts = preds.reduce((s: number, p: any) => s + (p.pointsEarned ?? 0), 0)
    const missed = preds.filter(
      (p: any) => p.pointsEarned != null && !p.breakdown?.exactScore && !p.breakdown?.correctResult
    ).length

    return {
      rank: rank + 1,
      name: m.userId.name as string,
      avatar: m.userId.avatar as string | undefined,
      userId: uid,
      isMe: uid === currentUserId,
      totalPoints: m.totalPoints as number,
      predicted: preds.length,
      exactScores,
      correctResults,
      missed,
      accuracy: preds.length > 0
        ? Math.round(((exactScores + correctResults) / preds.length) * 100)
        : 0,
      pointsPerMatch: preds.length > 0 ? +(totalPts / preds.length).toFixed(1) : 0,
      bestStreak: calcBestStreak(preds),
    }
  })

  // ── Points progression series ────────────────────────────────────────────
  // Build match label map
  const matchLabelMap = new Map<string, string>()
  let matchIndex = 1
  for (const m of finishedMatches) {
    const label = m.stage === 'group'
      ? `M${matchIndex}`
      : (m.stage === 'round_of_16' ? 'R16' : m.stage === 'quarter_final' ? 'QF' : m.stage === 'semi_final' ? 'SF' : m.stage === 'final' ? 'F' : `M${matchIndex}`)
    matchLabelMap.set(String(m._id), label)
    matchIndex++
  }

  const progressionSeries: MemberSeries[] = members.map((m: any) => {
    const uid = String(m.userId._id)
    const preds = predictions
      .filter((p: any) => String(p.userId) === uid)
      .sort((a: any, b: any) => {
        const aIdx = finishedMatches.findIndex((fm: any) => String(fm._id) === String(a.matchId))
        const bIdx = finishedMatches.findIndex((fm: any) => String(fm._id) === String(b.matchId))
        return aIdx - bIdx
      })

    let cumulative = 0
    const data = preds
      .filter((p: any) => matchLabelMap.has(String(p.matchId)))
      .map((p: any) => {
        cumulative += p.pointsEarned ?? 0
        return {
          matchLabel: matchLabelMap.get(String(p.matchId)) ?? '?',
          cumulative,
        }
      })

    return {
      userId: uid,
      name: m.userId.name as string,
      isMe: uid === currentUserId,
      data,
    }
  })

  // ── Accuracy breakdown ────────────────────────────────────────────────────
  const accuracyData: AccuracyEntry[] = memberStats.map((m) => ({
    name: m.name,
    exact: m.exactScores,
    result: m.correctResults,
    miss: m.missed,
    isMe: m.isMe,
  }))

  const mostAccurate = [...memberStats].sort((a, b) => b.accuracy - a.accuracy)[0]

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Summary bar */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Matches played" value={`${finishedMatches.length} / ${totalMatchCount}`} />
          <StatCard label="Total predictions" value={String(predictions.length)} />
          <StatCard
            label="Most accurate"
            value={mostAccurate?.name ?? '–'}
            sub={mostAccurate ? `${mostAccurate.accuracy}% accuracy` : undefined}
          />
        </div>

        {/* Charts */}
        <StatsCharts progressionSeries={progressionSeries} accuracyData={accuracyData} />

        {/* Per-member table — all rows are context objects (draggable + clickable) */}
        <section>
          <p className="text-[13px] font-semibold mb-3" style={{ color: 'rgb(240 235 227)' }}>Member Stats</p>
          {finishedMatches.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-3">📊</p>
              <p className="text-[12px]" style={{ color: 'rgb(107 100 92)' }}>Stats will appear once the first match finishes.</p>
            </div>
          ) : (
            <StatsContextTable
              members={memberStats.sort((a, b) => b.totalPoints - a.totalPoints)}
              matches={finishedMatches.map((m: any) => ({
                matchId: String(m._id),
                label: m.stage === 'group'
                  ? `${m.homeTeam?.shortName ?? '?'} vs ${m.awayTeam?.shortName ?? '?'}`
                  : m.stage === 'round_of_16' ? `R16: ${m.homeTeam?.shortName} vs ${m.awayTeam?.shortName}`
                  : m.stage === 'quarter_final' ? `QF: ${m.homeTeam?.shortName} vs ${m.awayTeam?.shortName}`
                  : m.stage === 'semi_final' ? `SF: ${m.homeTeam?.shortName} vs ${m.awayTeam?.shortName}`
                  : 'Final',
              }))}
              leagueSlug={params.leagueId}
              leagueMongoId={String(league._id)}
            />
          )}
        </section>

        {/* Legend */}
        <div className="flex flex-wrap gap-4" style={{ borderTop: '1px solid rgb(255 255 255 / 0.06)', paddingTop: '12px' }}>
          {[
            ['rgb(63 185 80)', 'Exact = correct score'],
            ['rgb(99 155 255)', 'Result = correct outcome'],
            ['rgb(107 100 92)', 'Accuracy = (exact + result) / predicted'],
            ['rgb(240 160 48)', '🔥 Streak = consecutive scoring preds'],
          ].map(([color, label]) => (
            <span key={label} style={{ fontSize: '11px', color }}>{label}</span>
          ))}
        </div>

      </div>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'rgb(36 34 32)', border: '1px solid rgb(255 255 255 / 0.07)' }}>
      <p style={{ fontSize: '10px', color: 'rgb(107 100 92)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</p>
      <p className="text-xl font-bold mt-1.5 truncate" style={{ color: 'rgb(240 235 227)' }}>{value}</p>
      {sub && <p style={{ fontSize: '11px', color: 'rgb(107 100 92)', marginTop: '2px' }}>{sub}</p>}
    </div>
  )
}

function calcBestStreak(preds: any[]): number {
  let best = 0, current = 0
  for (const p of preds) {
    if ((p.pointsEarned ?? 0) > 0) { current++; best = Math.max(best, current) }
    else current = 0
  }
  return best
}
