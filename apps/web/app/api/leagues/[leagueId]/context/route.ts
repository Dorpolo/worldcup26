import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'
import { connectDB, LeagueModel, MembershipModel, MatchModel } from '@worldcup26/db'

interface Params { params: { leagueId: string } }

export async function GET(req: NextRequest, { params }: Params) {
  const { user, error } = await getAuthUser(req)
  if (error) return error

  await connectDB()

  if (!(user as any).isInternal) {
    const membership = await MembershipModel.findOne({
      leagueId: params.leagueId,
      userId: (user as any)._id,
    }).lean()
    if (!membership) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  const league = await LeagueModel.findById(params.leagueId).lean() as any
  if (!league) return NextResponse.json({ ok: false, error: 'League not found' }, { status: 404 })

  const memberCount = await MembershipModel.countDocuments({ leagueId: params.leagueId })
  const totalMatches = await MatchModel.countDocuments()
  const finishedMatches = await MatchModel.countDocuments({ status: 'finished' })
  const upcomingCount = await MatchModel.countDocuments({ status: { $in: ['scheduled', 'locked'] } })

  const cfg = league.scoringConfig ?? {}
  const gs = cfg.groupStage ?? { exactScore: 3, correctResult: 1 }
  const ko = cfg.knockoutStage ?? { exactScore: 4, correctResult: 2, correctTeamAdvancing: 1 }
  const bonuses = cfg.bonuses ?? {}

  // Build plain-English rules
  const rulesText = `
LEAGUE: ${league.name}
MEMBERS: ${memberCount}
STATUS: ${league.status}

SCORING RULES:
Group Stage:
  - Exact score: ${gs.exactScore} pts
  - Correct result (win/draw/loss): ${gs.correctResult} pt${gs.correctResult !== 1 ? 's' : ''}

Knockout Stage:
  - Exact score: ${ko.exactScore} pts
  - Correct result: ${ko.correctResult} pts
  - Correct team advancing: ${ko.correctTeamAdvancing} pt${ko.correctTeamAdvancing !== 1 ? 's' : ''}

BONUS PREDICTIONS (locked before tournament starts):
${bonuses.tournamentWinner?.enabled ? `  - Tournament winner: ${bonuses.tournamentWinner.points} pts` : '  - Tournament winner: disabled'}
${bonuses.topScorer?.enabled ? `  - Top scorer: ${bonuses.topScorer.points} pts` : '  - Top scorer: disabled'}
${bonuses.topAssist?.enabled ? `  - Top assist: ${bonuses.topAssist.points} pts` : '  - Top assist: disabled'}
${(bonuses.custom ?? []).map((c: any) => `  - ${c.label}: ${c.points} pts — ${c.description}`).join('\n')}

CUP COMPETITION:
The league also runs a cup bracket alongside the main table.
Members are seeded by their points earned during each World Cup knockout round.
The bracket is ${league.cupStatus === 'active' ? 'currently active' : league.cupStatus === 'pending' ? 'not yet started' : 'completed'}.

PREDICTION RULES:
- Predictions lock 15 minutes before kickoff — you cannot change them after that
- If you don't submit a prediction, you score 0 points for that match
- Predictions are per-league; your picks in this league are private until the match starts

TOURNAMENT PROGRESS:
- ${finishedMatches} of ${totalMatches} matches played
- ${upcomingCount} matches remaining
`.trim()

  return NextResponse.json({
    ok: true,
    data: {
      leagueId: String(league._id),
      name: league.name,
      status: league.status,
      cupStatus: league.cupStatus,
      memberCount,
      scoringConfig: { groupStage: gs, knockoutStage: ko, bonuses },
      rulesText,
      matchProgress: { total: totalMatches, finished: finishedMatches, upcoming: upcomingCount },
    },
  })
}
