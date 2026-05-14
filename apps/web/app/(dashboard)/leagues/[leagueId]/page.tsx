import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { connectDB, UserModel, LeagueModel, MembershipModel, MatchModel } from '@worldcup26/db'
import Link from 'next/link'

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

  const upcoming = await MatchModel.find({ status: { $in: ['scheduled', 'locked'] } })
    .sort({ kickoffAt: 1 })
    .limit(3)
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

      {/* Mini leaderboard */}
      <div className="rounded-xl overflow-hidden"
        style={{ border: '1px solid rgb(255 255 255 / 0.07)' }}>
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid rgb(255 255 255 / 0.07)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: 'rgb(107 100 92)' }}>Standings</p>
          <Link href={`${base}/leaderboard`} className="text-[11px]"
            style={{ color: 'rgb(217 119 87)' }}>View all →</Link>
        </div>
        {top5.map((m: any, i: number) => {
          const isMe = String(m.userId._id) === String(user._id)
          return (
            <div key={String(m._id)} className="flex items-center gap-3 px-4 py-2.5"
              style={{
                background: isMe ? 'rgb(217 119 87 / 0.06)' : undefined,
                borderBottom: i < top5.length - 1 ? '1px solid rgb(255 255 255 / 0.04)' : undefined,
              }}>
              <span className="text-[11px] font-bold w-5 text-center shrink-0"
                style={{ color: i === 0 ? '#f5c842' : i === 1 ? '#a0a0a0' : i === 2 ? '#c87533' : 'rgb(107 100 92)' }}>
                {i < 3 ? ['🥇','🥈','🥉'][i] : `${i+1}`}
              </span>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden"
                style={{ background: 'rgb(217 119 87 / 0.15)', color: 'rgb(217 119 87)' }}>
                {m.userId.avatar
                  ? <img src={m.userId.avatar} alt="" className="w-full h-full object-cover" />
                  : m.userId.name?.charAt(0)}
              </div>
              <p className="flex-1 text-[12px] font-medium truncate"
                style={{ color: isMe ? 'rgb(240 235 227)' : 'rgb(160 152 144)' }}>
                {m.userId.name}
                {isMe && <span style={{ color: 'rgb(217 119 87)', fontSize: '10px' }}> you</span>}
              </p>
              <p className="text-[12px] font-semibold font-mono shrink-0"
                style={{ color: 'rgb(240 235 227)' }}>{m.totalPoints}</p>
            </div>
          )
        })}
      </div>

      {/* Upcoming matches */}
      {upcoming.length > 0 && (
        <div className="rounded-xl overflow-hidden"
          style={{ border: '1px solid rgb(255 255 255 / 0.07)' }}>
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgb(255 255 255 / 0.07)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgb(107 100 92)' }}>Coming Up</p>
            <Link href={`${base}/predictions`} className="text-[11px]"
              style={{ color: 'rgb(217 119 87)' }}>Predict →</Link>
          </div>
          {upcoming.map((match: any, i: number) => {
            const kickoff = new Date(match.kickoffAt)
            return (
              <div key={String(match._id)} className="px-4 py-3 flex items-center gap-3"
                style={{ borderBottom: i < upcoming.length - 1 ? '1px solid rgb(255 255 255 / 0.04)' : undefined }}>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium truncate" style={{ color: 'rgb(240 235 227)' }}>
                    {match.homeTeam?.name ?? match.homeTeam} vs {match.awayTeam?.name ?? match.awayTeam}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'rgb(107 100 92)' }}>
                    {kickoff.toLocaleDateString()} · {kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {match.status === 'locked' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'rgb(248 81 73 / 0.15)', color: 'rgb(248 81 73)' }}>Locked</span>
                )}
              </div>
            )
          })}
        </div>
      )}

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
