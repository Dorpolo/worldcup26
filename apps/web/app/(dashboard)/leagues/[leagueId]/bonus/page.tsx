import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { connectDB, UserModel, LeagueModel, MembershipModel, BonusPredictionModel, MatchModel } from '@worldcup26/db'
import { BonusPredictionsClient } from './BonusPredictionsClient'

interface Props {
  params: { leagueId: string }
}

export default async function BonusPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  await connectDB()

  const user = await UserModel.findOne({ email: session.user.email }).lean() as any
  if (!user) redirect('/login')

  const league = await LeagueModel.findOne({ slug: params.leagueId }).lean() as any
  if (!league) redirect('/leagues')

  const membership = await MembershipModel.findOne({ userId: user._id, leagueId: league._id }).lean() as any
  if (!membership) redirect('/leagues')

  const [bonusPredictions, firstMatch] = await Promise.all([
    BonusPredictionModel.find({ userId: user._id, leagueId: league._id }).lean(),
    MatchModel.findOne({}).sort({ kickoffAt: 1 }).lean() as any,
  ])

  const isLocked = firstMatch ? new Date() >= new Date((firstMatch as any).kickoffAt) : false
  const config = league.scoringConfig.bonuses

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="max-w-2xl mx-auto space-y-4">
        <div>
          <h1 className="text-[15px] font-semibold" style={{ color: 'rgb(240 235 227)' }}>Bonus Predictions</h1>
          <p className="text-[12px] mt-0.5" style={{ color: isLocked ? 'rgb(240 160 48)' : 'rgb(107 100 92)' }}>
            {isLocked
              ? '🔒 Locked — tournament has started'
              : 'Lock when the first match kicks off'}
          </p>
        </div>

        <BonusPredictionsClient
          leagueId={String(league._id)}
          config={JSON.parse(JSON.stringify(config))}
          existingPredictions={JSON.parse(JSON.stringify(bonusPredictions))}
          isLocked={isLocked}
        />
      </div>
    </div>
  )
}
