import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { connectDB, UserModel, LeagueModel, MembershipModel, CupBracketModel } from '@worldcup26/db'
import { CupBracketView } from './CupBracketView'

interface Props { params: { leagueId: string } }

export default async function CupPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  await connectDB()

  const user = await UserModel.findOne({ email: session.user.email }).lean() as any
  if (!user) redirect('/login')

  const league = await LeagueModel.findOne({ slug: params.leagueId }).lean() as any
  if (!league) redirect('/leagues')

  const membership = await MembershipModel.findOne({ userId: user._id, leagueId: league._id }).lean() as any
  if (!membership) redirect('/leagues')

  const isOwner = String(league.ownerId) === String(user._id)

  const bracket = await CupBracketModel.findOne({ leagueId: league._id }).lean() as any

  // Build userId → name map from all memberships
  const members = await MembershipModel.find({ leagueId: league._id })
    .populate('userId', 'name avatar')
    .lean() as any[]
  const userMap: Record<string, { name: string; avatar?: string }> = {}
  for (const m of members) {
    userMap[String(m.userId._id)] = { name: m.userId.name, avatar: m.userId.avatar }
  }

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="space-y-5">
        <div>
          <h1 className="text-[15px] font-semibold" style={{ color: 'rgb(var(--c-text-1))' }}>Cup Competition</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'rgb(var(--c-text-3))' }}>
            Head-to-head bracket — points per World Cup stage
          </p>
        </div>

        <CupBracketView
          bracket={bracket ? JSON.parse(JSON.stringify(bracket)) : null}
          userMap={userMap}
          currentUserId={String(user._id)}
          isOwner={isOwner}
          leagueId={String(league._id)}
          leagueSlug={params.leagueId}
          memberCount={members.length}
        />
      </div>
    </div>
  )
}
