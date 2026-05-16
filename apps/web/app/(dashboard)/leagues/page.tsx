import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { connectDB, UserModel, MembershipModel } from '@worldcup26/db'
import Link from 'next/link'

export default async function LeaguesPage() {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  await connectDB()
  const user = await UserModel.findOne({ email: session.user.email }).lean() as any
  if (!user) redirect('/login')

  const memberships = await MembershipModel.find({ userId: user._id })
    .populate('leagueId')
    .lean() as any

  if (memberships.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 text-center p-8">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl" style={{ background: 'rgb(217 119 87 / 0.1)' }}>⚽</div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold" style={{ color: 'rgb(var(--c-text-1))' }}>No leagues yet</h2>
          <p className="text-sm" style={{ color: 'rgb(var(--c-text-3))' }}>Create a league or join one with an invite link.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/leagues/new"
            className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-opacity hover:opacity-90"
            style={{ background: 'rgb(217 119 87)', color: 'rgb(var(--c-bg))' }}
          >
            Create a league
          </Link>
        </div>
      </div>
    )
  }

  // Redirect to first league
  const firstLeague = memberships[0].leagueId as any
  redirect(`/leagues/${firstLeague.slug}`)
}
