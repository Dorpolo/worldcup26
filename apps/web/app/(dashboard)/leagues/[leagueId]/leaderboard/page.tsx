import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { connectDB, UserModel, LeagueModel, MembershipModel } from '@worldcup26/db'

interface Props {
  params: { leagueId: string }
}

export default async function LeaderboardPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  await connectDB()
  const user = await UserModel.findOne({ email: session.user.email }).lean() as any
  const league = await LeagueModel.findOne({ slug: params.leagueId }).lean() as any
  if (!league) notFound()

  const memberships = await MembershipModel.find({ leagueId: league._id })
    .populate('userId', 'name avatar email')
    .sort({ totalPoints: -1 })
    .lean() as any

  const currentUserId = String(user?._id)

  return (
    <div className="h-full overflow-y-auto p-6">
      <h2 className="text-xl font-bold mb-6">Leaderboard</h2>

      <div className="space-y-2 max-w-2xl">
        {memberships.map((m: any, i: number) => {
          const member = m.userId as any
          const isMe = String(member._id) === currentUserId
          const rank = i + 1

          return (
            <div
              key={String(m._id)}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                isMe ? 'bg-primary/5 border-primary/20' : 'bg-card'
              }`}
            >
              {/* Rank */}
              <div
                className={`w-8 text-center font-bold text-sm ${
                  rank === 1
                    ? 'text-yellow-500'
                    : rank === 2
                      ? 'text-gray-400'
                      : rank === 3
                        ? 'text-amber-600'
                        : 'text-muted-foreground'
                }`}
              >
                {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
              </div>

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0 overflow-hidden">
                {member.avatar ? (
                  <img src={member.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  member.name?.charAt(0).toUpperCase()
                )}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {member.name} {isMe && <span className="text-xs text-primary">(you)</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {m.role === 'owner' ? 'League owner' : 'Member'}
                </p>
              </div>

              {/* Points */}
              <div className="text-right">
                <p className="font-bold text-lg">{m.totalPoints}</p>
                <p className="text-xs text-muted-foreground">pts</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
