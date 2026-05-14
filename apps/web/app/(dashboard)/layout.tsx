import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { connectDB, UserModel, MembershipModel } from '@worldcup26/db'
import { getInitials } from '@/lib/utils'
import { LogOutButton } from '@/components/shared/LogOutButton'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  await connectDB()
  const user = await UserModel.findOne({ email: session.user.email }).lean() as any
  // User not in DB but has a valid JWT (e.g. stale cookie from another env).
  // Sign them out to clear the cookie and avoid a redirect loop.
  if (!user) redirect('/api/auth/signout?callbackUrl=/login')

  const memberships = await MembershipModel.find({ userId: user._id })
    .populate('leagueId', 'name slug avatar')
    .lean() as any[]

  const leagues = memberships.map((m: any) => ({
    id: String((m.leagueId as any)._id),
    slug: (m.leagueId as any).slug,
    name: (m.leagueId as any).name,
    avatar: (m.leagueId as any).avatar,
    points: m.totalPoints,
    rank: m.rank,
  }))

  const userData = {
    name: user.name,
    avatar: user.avatar,
    initials: getInitials(user.name),
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'rgb(26 25 23)' }}>
      {/* ── Left Sidebar ────────────────────────────────────────── */}
      <aside
        className="w-56 shrink-0 flex flex-col"
        style={{
          background: 'rgb(22 21 19)',
          borderRight: '1px solid rgb(255 255 255 / 0.07)',
        }}
      >
        {/* Logo */}
        <Link
          href="/leagues"
          className="flex items-center gap-2.5 px-4 py-4 group"
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 font-bold"
            style={{ background: 'linear-gradient(135deg, #d97757, #c8664a)' }}
          >
            ⚽
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold tracking-tight" style={{ color: 'rgb(240 235 227)' }}>
              WC 2026
            </p>
            <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: 'rgb(107 100 92)' }}>
              Predictions
            </p>
          </div>
        </Link>

        {/* Separator */}
        <div style={{ height: '1px', background: 'rgb(255 255 255 / 0.06)', margin: '0 16px' }} />

        {/* League list */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          <p
            className="text-[10px] font-semibold uppercase tracking-widest px-2 pb-1.5"
            style={{ color: 'rgb(107 100 92)' }}
          >
            My Leagues
          </p>

          {leagues.map((league: any) => (
            <Link
              key={league.id}
              href={`/leagues/${league.slug}`}
              className="flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all duration-150 group"
              style={{ color: 'rgb(160 152 144)' }}
            >
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden"
                style={{ background: 'rgb(255 255 255 / 0.07)' }}
              >
                {league.avatar ? (
                  <img src={league.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span style={{ color: 'rgb(217 119 87)' }}>{getInitials(league.name)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate leading-tight" style={{ color: 'rgb(240 235 227)' }}>
                  {league.name}
                </p>
                <p className="text-[11px] leading-tight mt-0.5" style={{ color: 'rgb(107 100 92)' }}>
                  {league.rank ? `#${league.rank} · ` : ''}{league.points} pts
                </p>
              </div>
            </Link>
          ))}

          <Link
            href="/leagues/new"
            className="flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all duration-150 mt-1"
            style={{ color: 'rgb(107 100 92)' }}
          >
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-base shrink-0"
              style={{ border: '1.5px dashed rgb(255 255 255 / 0.12)' }}
            >
              +
            </div>
            <span className="text-[13px]">New league</span>
          </Link>
        </nav>

        {/* User footer */}
        <div
          className="px-3 py-3"
          style={{ borderTop: '1px solid rgb(255 255 255 / 0.06)' }}
        >
          <Link
            href="/profile"
            className="flex items-center gap-2.5 w-full rounded-lg px-1 py-1 transition-opacity hover:opacity-80"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden"
              style={{ background: 'rgb(217 119 87 / 0.2)', color: 'rgb(217 119 87)' }}
            >
              {userData.avatar ? (
                <img src={userData.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                userData.initials
              )}
            </div>
            <p className="text-[13px] font-medium flex-1 min-w-0 truncate" style={{ color: 'rgb(160 152 144)' }}>
              {userData.name}
            </p>
          </Link>
          <div className="flex items-center justify-between mt-1 px-1">
            <span className="text-[10px]" style={{ color: 'rgb(58 55 51)' }}>Profile &amp; API key</span>
            <LogOutButton />
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  )
}
