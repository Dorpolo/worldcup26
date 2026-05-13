import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { connectDB, UserModel, LeagueModel, MembershipModel } from '@worldcup26/db'
import Link from 'next/link'

interface Props {
  children: React.ReactNode
  params: { leagueId: string }
}

const NAV_TABS = [
  { href: '', label: '💬 Chat', segment: null },
  { href: '/leaderboard', label: '🏆 Leaderboard', segment: 'leaderboard' },
  { href: '/predictions', label: '📝 Predictions', segment: 'predictions' },
  { href: '/bonus', label: '🎁 Bonuses', segment: 'bonus' },
  { href: '/cup', label: '🥇 Cup', segment: 'cup' },
  { href: '/stats', label: '📊 Stats', segment: 'stats' },
  { href: '/rules', label: '📋 Rules', segment: 'rules' },
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

  if (!membership) {
    // User is not a member — redirect to join or leagues list
    redirect('/leagues')
  }

  const isOwner = membership.role === 'owner'
  const base = `/leagues/${params.leagueId}`

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* League header */}
      <header className="border-b px-6 py-3 flex items-center gap-4 shrink-0">
        <div>
          <h2 className="font-semibold">{league.name}</h2>
          <p className="text-xs text-muted-foreground">
            #{membership.rank} · {membership.totalPoints} pts · {league.memberCount} members
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {isOwner && (
            <Link
              href={`${base}/settings`}
              className="text-xs text-muted-foreground hover:text-foreground px-3 py-1 rounded-md hover:bg-accent transition-colors"
            >
              Settings
            </Link>
          )}
        </div>
      </header>

      {/* Tab nav */}
      <nav className="border-b px-6 flex gap-1 shrink-0">
        {NAV_TABS.map((tab) => (
          <Link
            key={tab.href}
            href={`${base}${tab.href}`}
            className="px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-primary transition-colors whitespace-nowrap"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {/* Page content */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
