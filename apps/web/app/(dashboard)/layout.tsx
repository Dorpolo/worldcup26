import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { connectDB, UserModel, MembershipModel, LeagueModel } from '@worldcup26/db'
import { getInitials } from '@/lib/utils'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  await connectDB()
  const user = await UserModel.findOne({ email: session.user.email }).lean()
  if (!user) redirect('/login')

  const memberships = await MembershipModel.find({ userId: user._id })
    .populate('leagueId', 'name slug avatar')
    .lean()

  const leagues = memberships.map((m) => ({
    id: String((m.leagueId as any)._id),
    slug: (m.leagueId as any).slug,
    name: (m.leagueId as any).name,
    avatar: (m.leagueId as any).avatar,
    points: m.totalPoints,
    rank: m.rank,
  }))

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col shrink-0">
        {/* App header */}
        <div className="p-4 border-b">
          <Link href="/leagues" className="flex items-center gap-2 font-bold text-lg">
            <span className="text-2xl">⚽</span>
            <span>WC2026</span>
          </Link>
        </div>

        {/* League list */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider px-2 py-1">
            My Leagues
          </p>
          {leagues.map((league) => (
            <Link
              key={league.id}
              href={`/leagues/${league.slug}`}
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {league.avatar ? (
                  <img src={league.avatar} alt="" className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  getInitials(league.name)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{league.name}</p>
                <p className="text-xs text-muted-foreground">#{league.rank} · {league.points} pts</p>
              </div>
            </Link>
          ))}

          <Link
            href="/leagues/new"
            className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground mt-2"
          >
            <div className="w-8 h-8 rounded-lg border-2 border-dashed flex items-center justify-center text-lg shrink-0">
              +
            </div>
            <span className="text-sm">Create league</span>
          </Link>
        </nav>

        {/* User footer */}
        <div className="p-4 border-t flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              getInitials(user.name)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
          </div>
          <Link href="/profile" className="text-muted-foreground hover:text-foreground text-xs">
            Settings
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  )
}
