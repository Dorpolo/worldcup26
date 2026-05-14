import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { connectDB, UserModel, LeagueModel, MembershipModel, MatchModel, PredictionModel } from '@worldcup26/db'
import { MatchCard } from '@/components/predictions/MatchCard'

interface Props {
  params: { leagueId: string }
  searchParams: { userId?: string }
}

const STAGE_LABELS: Record<string, string> = {
  group: 'Group Stage',
  round_of_16: 'Round of 16',
  quarter_final: 'Quarter Finals',
  semi_final: 'Semi Finals',
  third_place: 'Third Place',
  final: 'Final',
}

const STAGE_ORDER = ['group', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final']

export default async function PredictionsPage({ params, searchParams }: Props) {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  await connectDB()

  const user = await UserModel.findOne({ email: session.user.email }).lean() as any
  if (!user) redirect('/login')

  const league = await LeagueModel.findOne({ slug: params.leagueId }).lean() as any
  if (!league) redirect('/leagues')

  const membership = await MembershipModel.findOne({ userId: user._id, leagueId: league._id }).lean() as any
  if (!membership) redirect('/leagues')

  // Support viewing another member's predictions via ?userId=
  const viewingUserId = searchParams.userId ?? String(user._id)
  const isViewingOther = viewingUserId !== String(user._id)

  // Verify the viewed user is actually a member
  let viewingUser = user
  if (isViewingOther) {
    const viewedMembership = await MembershipModel.findOne({
      userId: viewingUserId,
      leagueId: league._id,
    }).populate('userId', 'name avatar').lean() as any
    if (viewedMembership) viewingUser = viewedMembership.userId
  }

  const [matches, predictions] = await Promise.all([
    MatchModel.find({}).sort({ kickoffAt: 1 }).lean(),
    PredictionModel.find({ userId: viewingUserId, leagueId: league._id }).lean(),
  ])

  const predMap = new Map(predictions.map((p) => [String(p.matchId), p]))

  // Group matches by stage, then by date within stage
  const byStage = new Map<string, typeof matches>()
  for (const m of matches) {
    const s = m.stage
    if (!byStage.has(s)) byStage.set(s, [])
    byStage.get(s)!.push(m)
  }

  if (matches.length === 0) {
    return (
      <div className="h-full overflow-y-auto flex items-center justify-center">
        <div className="text-center space-y-3 py-16">
          <p className="text-4xl">📅</p>
          <p className="text-sm font-medium" style={{ color: 'rgb(160 152 144)' }}>No fixtures yet</p>
          <p className="text-[12px]" style={{ color: 'rgb(107 100 92)' }}>
            Fixtures will appear once the schedule is synced
          </p>
        </div>
      </div>
    )
  }

  const predicted = predictions.length
  const total = matches.filter(m => m.status === 'scheduled' || m.status === 'locked').length

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Viewing another user banner */}
        {isViewingOther && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[12px]"
            style={{ background: 'rgb(217 119 87 / 0.08)', border: '1px solid rgb(217 119 87 / 0.2)' }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden"
              style={{ background: 'rgb(217 119 87 / 0.2)', color: 'rgb(217 119 87)' }}
            >
              {viewingUser?.avatar
                ? <img src={viewingUser.avatar} alt="" className="w-full h-full object-cover" />
                : viewingUser?.name?.charAt(0)}
            </div>
            <span style={{ color: 'rgb(217 119 87)' }}>
              Viewing {viewingUser?.name ?? 'member'}'s predictions
            </span>
            <a
              href={`/leagues/${params.leagueId}/predictions`}
              className="ml-auto text-[11px] underline"
              style={{ color: 'rgb(107 100 92)' }}
            >
              View mine
            </a>
          </div>
        )}

        {/* Progress bar */}
        {total > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgb(255 255 255 / 0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min((predicted / total) * 100, 100)}%`, background: 'rgb(217 119 87)' }}
              />
            </div>
            <span className="text-[11px] font-mono shrink-0" style={{ color: 'rgb(107 100 92)' }}>
              {predicted}/{total} predicted
            </span>
          </div>
        )}

        {STAGE_ORDER.filter((s) => byStage.has(s)).map((stage) => {
          const stageMatches = byStage.get(stage)!
          const byDate = new Map<string, typeof stageMatches>()
          for (const m of stageMatches) {
            const dateKey = new Date(m.kickoffAt).toLocaleDateString('en-GB', {
              weekday: 'long', day: 'numeric', month: 'long',
            })
            if (!byDate.has(dateKey)) byDate.set(dateKey, [])
            byDate.get(dateKey)!.push(m)
          }

          return (
            <section key={stage}>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full"
                  style={{ background: 'rgb(217 119 87 / 0.12)', color: 'rgb(217 119 87)' }}
                >
                  {STAGE_LABELS[stage] ?? stage}
                </span>
                <span className="text-[10px]" style={{ color: 'rgb(107 100 92)' }}>
                  {stageMatches.length} matches
                </span>
              </div>

              <div className="space-y-3">
                {Array.from(byDate.entries()).map(([date, dateMatches]) => (
                  <div key={date}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgb(58 55 51)' }}>
                      {date}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {dateMatches.map((match) => {
                        const pred = predMap.get(String(match._id))
                        return (
                          <MatchCard
                            key={String(match._id)}
                            matchId={String(match._id)}
                            leagueId={String(league._id)}
                            leagueSlug={params.leagueId}
                            homeTeam={match.homeTeam}
                            awayTeam={match.awayTeam}
                            kickoffAt={match.kickoffAt.toISOString()}
                            lockAt={match.lockAt.toISOString()}
                            status={match.status}
                            result={match.result as any}
                            group={match.group}
                            prediction={pred ? {
                              homeScore: pred.homeScore,
                              awayScore: pred.awayScore,
                              pointsEarned: pred.pointsEarned,
                              isLocked: pred.isLocked,
                            } : undefined}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
