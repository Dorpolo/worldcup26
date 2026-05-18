import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { connectDB, UserModel, LeagueModel, MembershipModel } from '@worldcup26/db'
import Link from 'next/link'
import { LeagueTabNav } from '@/components/shared/LeagueTabNav'
import { LeagueShell } from '@/components/shared/LeagueShell'

interface Props {
  children: React.ReactNode
  params: { leagueId: string }
}

const NAV_TABS = [
  { href: '',             label: 'Chat',        icon: '◈' },
  { href: '/leaderboard', label: 'Leaderboard', icon: '↑' },
  { href: '/predictions', label: 'Predictions', icon: '⊡' },
  { href: '/bonus',       label: 'Bonus',       icon: '★' },
  { href: '/cup',         label: 'Cup',         icon: '◎' },
  { href: '/stats',       label: 'Stats',       icon: '⌇' },
  { href: '/rules',       label: 'Rules',       icon: '≡' },
  { href: '/agent',       label: 'Agent',       icon: '⚡' },
]

export default async function LeagueLayout({ children, params }: Props) {
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

  const isOwner = membership.role === 'owner'
  const base = `/leagues/${params.leagueId}`

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Vertical league nav ─────────────────────────────────── */}
      <nav
        className="w-44 shrink-0 flex flex-col"
        style={{
          borderRight: '1px solid rgb(var(--c-border-subtle))',
          background: 'rgb(var(--c-bg-sidebar, var(--bg-sidebar)))',
        }}
      >
        {/* League identity */}
        <div className="px-3 pt-4 pb-3 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden"
              style={{ background: 'rgb(217 119 87 / 0.15)', color: 'rgb(217 119 87)' }}
            >
              {league.avatar ? (
                <img src={league.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                league.name.charAt(0).toUpperCase()
              )}
            </div>
            <p
              className="text-[12px] font-semibold truncate leading-tight"
              style={{ color: 'rgb(var(--c-text-1))' }}
            >
              {league.name}
            </p>
          </div>
          <p className="text-[10px] px-0.5" style={{ color: 'rgb(var(--c-text-3))' }}>
            {membership.rank ? `#${membership.rank} · ` : ''}
            {membership.totalPoints ?? 0} pts · {league.memberCount} members
          </p>
        </div>

        <div style={{ height: '1px', background: 'rgb(var(--c-border-subtle))', margin: '0 12px' }} />

        {/* Tab links */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          <LeagueTabNav base={base} tabs={NAV_TABS} vertical />
        </div>

        {/* Settings at bottom */}
        {isOwner && (
          <div
            className="shrink-0 px-2 py-2"
            style={{ borderTop: '1px solid rgb(var(--c-border-subtle))' }}
          >
            <Link
              href={`${base}/settings`}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium w-full transition-all duration-150"
              style={{ color: 'rgb(var(--c-text-3))' }}
            >
              <span className="text-[13px] w-4 text-center">⚙</span>
              Settings
            </Link>
          </div>
        )}
      </nav>

      {/* ── Main content (LeagueShell adds Declan sidebar on non-chat pages) ── */}
      <LeagueShell
        leagueSlug={params.leagueId}
        leagueId={String(league._id)}
        leagueName={league.name}
        userName={user.name}
        userRank={membership.rank ?? 0}
        userPoints={membership.totalPoints ?? 0}
        hasAiKey={!!user.aiApiKey}
      >
        {children}
      </LeagueShell>

    </div>
  )
}
