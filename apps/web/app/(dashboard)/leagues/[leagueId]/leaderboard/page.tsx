import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { connectDB, UserModel, LeagueModel, MembershipModel } from '@worldcup26/db'
import { LeaderboardClient } from './LeaderboardClient'

interface Props { params: { leagueId: string } }

export default async function LeaderboardPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  await connectDB()
  const user = await UserModel.findOne({ email: session.user.email }).lean() as any
  const league = await LeagueModel.findOne({ slug: params.leagueId }).lean() as any
  if (!league) notFound()

  const memberships = await MembershipModel.find({ leagueId: league._id })
    .populate('userId', 'name avatar')
    .sort({ totalPoints: -1 })
    .lean() as any[]

  const currentUserId = String(user?._id)

  const initial = memberships.map((m: any, i: number) => ({
    userId: String(m.userId._id),
    name: m.userId.name,
    avatar: m.userId.avatar,
    totalPoints: m.totalPoints,
    rank: i + 1,
    role: m.role,
    isMe: String(m.userId._id) === currentUserId,
  }))

  return (
    <LeaderboardClient
      leagueId={String(league._id)}
      initial={initial}
    />
  )
}
