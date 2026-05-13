import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { connectDB, UserModel, LeagueModel, MembershipModel, MatchModel, PredictionModel } from '@worldcup26/db'
import { MatchCard } from '@/components/predictions/MatchCard'

interface Props {
  params: { leagueId: string }
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

export default async function PredictionsPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  await connectDB()

  const user = await UserModel.findOne({ email: session.user.email }).lean() as any
  if (!user) redirect('/login')

  const league = await LeagueModel.findOne({ slug: params.leagueId }).lean() as any
  if (!league) redirect('/leagues')

  const membership = await MembershipModel.findOne({ userId: user._id, leagueId: league._id }).lean() as any
  if (!membership) redirect('/leagues')

  const [matches, predictions] = await Promise.all([
    MatchModel.find({}).sort({ kickoffAt: 1 }).lean(),
    PredictionModel.find({ userId: user._id, leagueId: league._id }).lean(),
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
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-4">📅</p>
          <p className="text-lg font-medium">No fixtures yet</p>
          <p className="text-sm mt-1">Fixtures will appear here once the league admin syncs the schedule.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto space-y-8">
        {STAGE_ORDER.filter((s) => byStage.has(s)).map((stage) => {
          const stageMatches = byStage.get(stage)!

          // Group by date within stage
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
              <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-sm">
                  {STAGE_LABELS[stage] ?? stage}
                </span>
                <span className="text-xs text-muted-foreground">{stageMatches.length} matches</span>
              </h2>

              <div className="space-y-4">
                {Array.from(byDate.entries()).map(([date, dateMatches]) => (
                  <div key={date}>
                    <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">{date}</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {dateMatches.map((match) => {
                        const pred = predMap.get(String(match._id))
                        return (
                          <MatchCard
                            key={String(match._id)}
                            matchId={String(match._id)}
                            leagueId={String(league._id)}
                            homeTeam={match.homeTeam}
                            awayTeam={match.awayTeam}
                            kickoffAt={match.kickoffAt.toISOString()}
                            lockAt={match.lockAt.toISOString()}
                            status={match.status}
                            result={match.result}
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
