import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { connectDB, UserModel, LeagueModel, MembershipModel } from '@worldcup26/db'
import { SettingsClient } from './SettingsClient'

interface Props {
  params: { leagueId: string }
}

export default async function SettingsPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  await connectDB()

  const user = await UserModel.findOne({ email: session.user.email }).lean() as any
  if (!user) redirect('/login')

  const league = await LeagueModel.findOne({ slug: params.leagueId }).lean() as any
  if (!league) redirect('/leagues')

  const membership = await MembershipModel.findOne({
    userId: user._id,
    leagueId: league._id,
    role: 'owner',
  }).lean() as any

  if (!membership) redirect(`/leagues/${params.leagueId}`)

  // Fetch members for the member management section
  const members = await MembershipModel.find({ leagueId: league._id })
    .populate('userId', 'name avatar email')
    .sort({ totalPoints: -1 })
    .lean() as any

  const membersData = members.map((m: any, i: number) => ({
    membershipId: String(m._id),
    userId: String((m.userId as any)._id),
    name: (m.userId as any).name,
    avatar: (m.userId as any).avatar,
    email: (m.userId as any).email,
    role: m.role,
    totalPoints: m.totalPoints,
    rank: i + 1,
  }))

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-xl font-semibold">League Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your league — owner only</p>
        </div>

        <SettingsClient
          leagueId={String(league._id)}
          leagueSlug={params.leagueId}
          scoringConfig={JSON.parse(JSON.stringify(league.scoringConfig))}
          members={membersData}
          currentUserId={String(user._id)}
          baseUrl={process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}
        />
      </div>
    </div>
  )
}
