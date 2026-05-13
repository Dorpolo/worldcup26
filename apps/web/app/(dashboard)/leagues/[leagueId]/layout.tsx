import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { connectDB, UserModel, LeagueModel, MembershipModel, ChatMessageModel } from '@worldcup26/db'
import Link from 'next/link'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { LeagueTabNav } from '@/components/shared/LeagueTabNav'

interface Props {
  children: React.ReactNode
  params: { leagueId: string }
}

const NAV_TABS = [
  { href: '',             label: 'Overview',    icon: '◈' },
  { href: '/leaderboard', label: 'Leaderboard', icon: '↑' },
  { href: '/predictions', label: 'Predictions', icon: '⊡' },
  { href: '/bonus',       label: 'Bonus',       icon: '★' },
  { href: '/cup',         label: 'Cup',         icon: '◎' },
  { href: '/stats',       label: 'Stats',       icon: '⌇' },
  { href: '/rules',       label: 'Rules',       icon: '≡' },
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

  // Load last 20 chat messages for the panel
  const history = await ChatMessageModel.find({
    userId: user._id,
    leagueId: league._id,
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean() as any[]

  const chatHistory = history.reverse().map((m: any) => ({
    id: String(m._id),
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: tabs + content ────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* League header */}
        <header
          className="shrink-0 px-5 py-3 flex items-center gap-3"
          style={{ borderBottom: '1px solid rgb(255 255 255 / 0.07)' }}
        >
          {/* League avatar */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden"
            style={{ background: 'rgb(217 119 87 / 0.15)', color: 'rgb(217 119 87)' }}
          >
            {league.avatar ? (
              <img src={league.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              league.name.charAt(0).toUpperCase()
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-[13px] font-semibold truncate" style={{ color: 'rgb(240 235 227)' }}>
              {league.name}
            </h1>
            <p className="text-[11px]" style={{ color: 'rgb(107 100 92)' }}>
              Rank #{membership.rank ?? '—'} &nbsp;·&nbsp; {membership.totalPoints ?? 0} pts &nbsp;·&nbsp; {league.memberCount} members
            </p>
          </div>

          {isOwner && (
            <Link
              href={`${base}/settings`}
              className="text-[11px] px-2.5 py-1.5 rounded-md transition-colors"
              style={{ color: 'rgb(107 100 92)', background: 'rgb(255 255 255 / 0.05)' }}
            >
              Settings
            </Link>
          )}
        </header>

        {/* Tab nav */}
        <nav
          className="shrink-0 px-5 flex items-end gap-0.5 overflow-x-auto"
          style={{ borderBottom: '1px solid rgb(255 255 255 / 0.07)' }}
        >
          <LeagueTabNav base={base} tabs={NAV_TABS} />
        </nav>

        {/* Page content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>

      {/* ── Right: persistent chat panel ────────────────────────── */}
      <ChatPanel
        leagueId={String(league._id)}
        leagueName={league.name}
        userName={user.name}
        userRank={membership.rank ?? 0}
        userPoints={membership.totalPoints ?? 0}
        initialMessages={chatHistory}
      />
    </div>
  )
}
