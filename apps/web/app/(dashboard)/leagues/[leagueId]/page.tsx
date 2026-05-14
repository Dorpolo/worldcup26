import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { connectDB, UserModel, LeagueModel, MembershipModel, MatchModel } from '@worldcup26/db'
import Link from 'next/link'
import { OverviewContextCards } from './OverviewContextCards'

interface Props { params: { leagueId: string } }

export default async function LeagueOverviewPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  await connectDB()

  const user = await UserModel.findOne({ email: session.user.email }).lean() as any
  if (!user) redirect('/login')

  const league = await LeagueModel.findOne({ slug: params.leagueId }).lean() as any
  if (!league) notFound()

  const membership = await MembershipModel.findOne({
    userId: user._id,
    leagueId: league._id,
  }).lean() as any
  if (!membership) redirect('/leagues')

  const top5 = await MembershipModel.find({ leagueId: league._id })
    .sort({ totalPoints: -1 })
    .limit(5)
    .populate('userId', 'name avatar')
    .lean() as any[]

  const upcoming = await MatchModel.find({ status: { $in: ['scheduled', 'locked', 'finished'] } })
    .sort({ kickoffAt: -1 })
    .limit(5)
    .lean() as any[]

  const base = `/leagues/${params.leagueId}`
  const rank = membership.rank ?? 0
  const points = membership.totalPoints ?? 0
  const totalMembers = league.memberCount ?? top5.length

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      {/* Hero stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Your Rank',   value: rank > 0 ? `#${rank}` : '—', sub: `of ${totalMembers}` },
          { label: 'Your Points', value: String(points),               sub: 'total pts' },
          { label: 'Members',     value: String(totalMembers),         sub: 'competing' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4"
            style={{ background: 'rgb(255 255 255 / 0.04)', border: '1px solid rgb(255 255 255 / 0.07)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2"
              style={{ color: 'rgb(107 100 92)' }}>{s.label}</p>
            <p className="text-2xl font-bold tracking-tight" style={{ color: 'rgb(217 119 87)' }}>{s.value}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgb(107 100 92)' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Standings + coming up — all context objects */}
      <OverviewContextCards
        members={top5.map((m: any, i: number) => ({
          userId: String(m.userId._id),
          name: m.userId.name,
          avatar: m.userId.avatar,
          totalPoints: m.totalPoints,
          rank: i + 1,
          isMe: String(m.userId._id) === String(user._id),
        }))}
        upcomingMatches={upcoming.map((m: any) => ({
          matchId: String(m._id),
          homeTeam: m.homeTeam?.name ?? String(m.homeTeam),
          awayTeam: m.awayTeam?.name ?? String(m.awayTeam),
          kickoffAt: m.kickoffAt.toISOString(),
          status: m.status,
        }))}
        leagueSlug={params.leagueId}
        leagueMongoId={String(league._id)}
        base={base}
      />

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { href: `${base}/predictions`, icon: '⊡', label: 'Make Predictions' },
          { href: `${base}/cup`,         icon: '◎', label: 'Cup Bracket' },
          { href: `${base}/stats`,       icon: '⌇', label: 'Stats & Trends' },
          { href: `${base}/rules`,       icon: '≡', label: 'League Rules' },
        ].map((link) => (
          <Link key={link.href} href={link.href}
            className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl"
            style={{ background: 'rgb(255 255 255 / 0.03)', border: '1px solid rgb(255 255 255 / 0.07)' }}>
            <span className="text-sm" style={{ color: 'rgb(217 119 87)' }}>{link.icon}</span>
            <span className="text-[12px] font-medium" style={{ color: 'rgb(160 152 144)' }}>{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
