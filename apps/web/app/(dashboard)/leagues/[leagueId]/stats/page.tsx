'use server'

import { auth } from '@/auth'
import { connectDB, UserModel, LeagueModel, MembershipModel, MatchModel, PredictionModel } from '@worldcup26/db'
import { redirect, notFound } from 'next/navigation'

interface StageStats {
  predicted: number
  correct: number
  points: number
}

interface Stats {
  totalPoints: number
  totalPredictions: number
  exactMatches: number
  totalMatches: number
  accuracyRate: number
  statsByStage: Record<string, StageStats>
}

const STAGES_ORDER = [
  { id: 'group', label: 'Group Stage' },
  { id: 'round_of_16', label: 'Round of 16' },
  { id: 'quarter_final', label: 'Quarter Finals' },
  { id: 'semi_final', label: 'Semi Finals' },
  { id: 'third_place', label: '3rd Place Match' },
  { id: 'final', label: 'Final' },
]

export default async function StatsPage({
  params,
}: {
  params: { leagueId: string }
}) {
  const session = await auth()
  if (!session?.user?.email) {
    redirect('/login')
  }

  await connectDB()

  // Resolve slug to League._id and get User._id
  const user = await UserModel.findOne({ email: session.user.email }).lean() as any
  if (!user) {
    redirect('/login')
  }

  const league = await LeagueModel.findOne({ slug: params.leagueId }).lean() as any
  if (!league) {
    notFound()
  }

  // Get user membership in this league
  const membership = await MembershipModel.findOne({
    leagueId: league._id,
    userId: user._id,
  }).lean() as any

  if (!membership) {
    redirect(`/leagues/${params.leagueId}`)
  }

  // Get all matches and predictions
  const matches = await MatchModel.find({}).lean() as any[]
  const predictions = await PredictionModel.find({
    userId: user._id,
    leagueId: league._id,
  }).lean() as any[]

  // Calculate stats
  let totalPoints = 0
  let exactMatches = 0
  const statsByStage: Record<string, StageStats> = {}

  // Initialize stages
  STAGES_ORDER.forEach((stage) => {
    statsByStage[stage.id] = { predicted: 0, correct: 0, points: 0 }
  })

  // Process predictions
  predictions.forEach((pred) => {
    const stage = pred.stage || 'group'
    totalPoints += pred.pointsEarned || 0

    if (!statsByStage[stage]) {
      statsByStage[stage] = { predicted: 0, correct: 0, points: 0 }
    }

    statsByStage[stage].predicted += 1
    statsByStage[stage].points += pred.pointsEarned || 0

    // Check if exact score match
    if (pred.breakdown?.exactScore) {
      exactMatches += 1
      statsByStage[stage].correct += 1
    }
  })

  const totalPredictions = predictions.length
  const accuracyRate =
    totalPredictions > 0
      ? Math.round((exactMatches / totalPredictions) * 100)
      : 0

  // Render stats
  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'rgb(var(--c-text-1))' }}>
          Your Performance Stats
        </h1>
        <p style={{ color: 'rgb(var(--c-text-2))' }}>
          Track your predictions and tournament performance
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Points */}
        <div
          className="rounded-lg p-4"
          style={{ background: 'rgb(var(--c-bg-secondary))' }}
        >
          <p
            className="text-sm font-semibold uppercase tracking-wide mb-2"
            style={{ color: 'rgb(var(--c-text-3))' }}
          >
            Total Points
          </p>
          <p
            className="text-3xl font-bold"
            style={{ color: 'rgb(217 119 87)' }}
          >
            {totalPoints}
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: 'rgb(var(--c-text-3))' }}
          >
            points earned
          </p>
        </div>

        {/* Predictions Made */}
        <div
          className="rounded-lg p-4"
          style={{ background: 'rgb(var(--c-bg-secondary))' }}
        >
          <p
            className="text-sm font-semibold uppercase tracking-wide mb-2"
            style={{ color: 'rgb(var(--c-text-3))' }}
          >
            Predictions Made
          </p>
          <p
            className="text-3xl font-bold"
            style={{ color: 'rgb(155 155 155)' }}
          >
            {totalPredictions}
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: 'rgb(var(--c-text-3))' }}
          >
            out of {matches.length} matches
          </p>
        </div>

        {/* Exact Scores */}
        <div
          className="rounded-lg p-4"
          style={{ background: 'rgb(var(--c-bg-secondary))' }}
        >
          <p
            className="text-sm font-semibold uppercase tracking-wide mb-2"
            style={{ color: 'rgb(var(--c-text-3))' }}
          >
            Exact Scores
          </p>
          <p
            className="text-3xl font-bold"
            style={{ color: 'rgb(63 185 80)' }}
          >
            {exactMatches}
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: 'rgb(var(--c-text-3))' }}
          >
            perfect predictions
          </p>
        </div>

        {/* Accuracy Rate */}
        <div
          className="rounded-lg p-4"
          style={{ background: 'rgb(var(--c-bg-secondary))' }}
        >
          <p
            className="text-sm font-semibold uppercase tracking-wide mb-2"
            style={{ color: 'rgb(var(--c-text-3))' }}
          >
            Accuracy Rate
          </p>
          <p
            className="text-3xl font-bold"
            style={{ color: 'rgb(79 172 254)' }}
          >
            {accuracyRate}%
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: 'rgb(var(--c-text-3))' }}
          >
            exact predictions
          </p>
        </div>
      </div>

      {/* Performance by Stage */}
      <div>
        <h2
          className="text-lg font-semibold mb-4"
          style={{ color: 'rgb(var(--c-text-1))' }}
        >
          Performance by Stage
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {STAGES_ORDER.map((stage) => {
            const stats = statsByStage[stage.id]
            const accuracy =
              stats.predicted > 0
                ? Math.round((stats.correct / stats.predicted) * 100)
                : 0

            return (
              <div
                key={stage.id}
                className="rounded-lg p-4 space-y-3"
                style={{ background: 'rgb(var(--c-bg-secondary))' }}
              >
                <p
                  className="font-semibold"
                  style={{ color: 'rgb(var(--c-text-1))' }}
                >
                  {stage.label}
                </p>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: 'rgb(var(--c-text-2))' }}>
                      Predicted
                    </span>
                    <span
                      className="font-semibold"
                      style={{ color: 'rgb(var(--c-text-1))' }}
                    >
                      {stats.predicted}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span style={{ color: 'rgb(var(--c-text-2))' }}>
                      Exact Scores
                    </span>
                    <span
                      className="font-semibold"
                      style={{ color: 'rgb(63 185 80)' }}
                    >
                      {stats.correct}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span style={{ color: 'rgb(var(--c-text-2))' }}>
                      Accuracy
                    </span>
                    <span
                      className="font-semibold"
                      style={{ color: 'rgb(79 172 254)' }}
                    >
                      {accuracy}%
                    </span>
                  </div>

                  <div className="flex justify-between pt-2 border-t border-neutral-700">
                    <span style={{ color: 'rgb(var(--c-text-2))' }}>Points</span>
                    <span
                      className="font-semibold"
                      style={{ color: 'rgb(217 119 87)' }}
                    >
                      {stats.points}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Summary */}
      <div
        className="rounded-lg p-6"
        style={{ background: 'rgb(var(--c-bg-secondary))' }}
      >
        <h3
          className="text-lg font-semibold mb-3"
          style={{ color: 'rgb(var(--c-text-1))' }}
        >
          Quick Summary
        </h3>

        <p
          className="text-sm leading-relaxed"
          style={{ color: 'rgb(var(--c-text-2))' }}
        >
          {totalPredictions === 0 ? (
            <>You haven't made any predictions yet. Start predicting matches to earn points!</>
          ) : (
            <>
              You've predicted {totalPredictions} out of {matches.length} matches (
              {Math.round((totalPredictions / matches.length) * 100)}% coverage) and
              correctly guessed {exactMatches} exact scores for a {accuracyRate}%
              accuracy rate. You've earned <strong>{totalPoints} total points</strong> so
              far. {accuracyRate >= 50 ? 'Great work!' : 'Keep improving your predictions!'}
            </>
          )}
        </p>
      </div>
    </div>
  )
}
