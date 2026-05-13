import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { connectDB, UserModel, LeagueModel, MembershipModel } from '@worldcup26/db'

interface Props {
  params: { leagueId: string }
}

export default async function LeagueChatPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  await connectDB()
  const user = await UserModel.findOne({ email: session.user.email }).lean()
  const league = await LeagueModel.findOne({ slug: params.leagueId }).lean()
  if (!league) notFound()

  const membership = await MembershipModel.findOne({
    userId: user?._id,
    leagueId: league._id,
  }).lean()

  return (
    <div className="flex flex-col h-full">
      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Welcome message from AI */}
        <div className="flex gap-3 max-w-2xl">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm shrink-0">
            🤖
          </div>
          <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 space-y-1">
            <p className="text-sm font-medium">World Cup Assistant</p>
            <p className="text-sm text-muted-foreground">
              Hi! I&apos;m your World Cup 2026 assistant for <strong>{league.name}</strong>.
              You&apos;re currently ranked{' '}
              <strong>#{membership?.rank ?? '–'}</strong> with{' '}
              <strong>{membership?.totalPoints ?? 0} points</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              Ask me anything — standings, predictions, match stats, or what to predict next!
            </p>
          </div>
        </div>
      </div>

      {/* Chat input */}
      <div className="border-t p-4 shrink-0">
        <ChatInput leagueId={String(league._id)} leagueSlug={params.leagueId} />
      </div>
    </div>
  )
}

// Client component for the input
function ChatInput({ leagueId, leagueSlug }: { leagueId: string; leagueSlug: string }) {
  return (
    <form className="flex gap-3" action="#">
      <input
        type="text"
        placeholder="Ask anything about the league, predictions, or World Cup…"
        className="flex-1 border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
      />
      <button
        type="submit"
        className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-colors text-sm"
      >
        Send
      </button>
    </form>
  )
}
