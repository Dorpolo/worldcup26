import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { connectDB, UserModel, LeagueModel, MembershipModel } from '@worldcup26/db'
import { ChatWindow } from '@/components/chat/ChatWindow'

interface Props { params: { leagueId: string } }

export default async function LeagueChatPage({ params }: Props) {
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

  return (
    <div className="h-full w-full flex flex-col">
      <ChatWindow
        leagueId={String(league._id)}
        leagueName={league.name}
        userName={user.name}
        userRank={membership.rank ?? 0}
        userPoints={membership.totalPoints ?? 0}
      />
    </div>
  )
}
