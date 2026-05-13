import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { connectDB, UserModel, MembershipModel } from '@worldcup26/db'
import Link from 'next/link'

export default async function LeaguesPage() {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  await connectDB()
  const user = await UserModel.findOne({ email: session.user.email }).lean()
  if (!user) redirect('/login')

  const memberships = await MembershipModel.find({ userId: user._id })
    .populate('leagueId')
    .lean()

  if (memberships.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 text-center p-8">
        <div className="text-6xl">⚽</div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">You're not in any leagues yet</h2>
          <p className="text-muted-foreground">Create a league or join one with an invite link.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/leagues/new"
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
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
