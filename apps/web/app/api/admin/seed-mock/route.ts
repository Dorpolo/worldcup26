import { NextRequest, NextResponse } from 'next/server'
import {
  connectDB,
  UserModel,
  LeagueModel,
  MembershipModel,
  MatchModel,
  PredictionModel,
} from '@worldcup26/db'
import { nanoid } from 'nanoid'

// POST /api/admin/seed-mock?email=you@gmail.com
// Seeds a complete mock league + players + finished matches + predictions + points.
// Pass ?email= to add your real Google account as the league owner.
// Pass ?reset=true to wipe and re-seed from scratch.

const MOCK_USERS = [
  { name: 'Alice Martínez', email: 'alice@mock.wc26', avatar: '' },
  { name: 'Bob Chen',       email: 'bob@mock.wc26',   avatar: '' },
  { name: 'Carlos Silva',   email: 'carlos@mock.wc26', avatar: '' },
  { name: 'Dana Goldberg',  email: 'dana@mock.wc26',   avatar: '' },
]

// 8 finished group-stage matches + 4 upcoming
const MATCHES = [
  // ── Finished ──────────────────────────────────────────────────────────────
  {
    id: 'mock-1', stage: 'group', group: 'A',
    home: { name: 'France',    short: 'FRA', flag: '🇫🇷' },
    away: { name: 'Germany',   short: 'GER', flag: '🇩🇪' },
    kickoff: daysAgo(12), result: { h: 2, a: 1, winner: 'FRA' },
  },
  {
    id: 'mock-2', stage: 'group', group: 'B',
    home: { name: 'Brazil',    short: 'BRA', flag: '🇧🇷' },
    away: { name: 'Argentina', short: 'ARG', flag: '🇦🇷' },
    kickoff: daysAgo(11), result: { h: 1, a: 1, winner: null },
  },
  {
    id: 'mock-3', stage: 'group', group: 'C',
    home: { name: 'Spain',     short: 'ESP', flag: '🇪🇸' },
    away: { name: 'Portugal',  short: 'POR', flag: '🇵🇹' },
    kickoff: daysAgo(10), result: { h: 3, a: 0, winner: 'ESP' },
  },
  {
    id: 'mock-4', stage: 'group', group: 'D',
    home: { name: 'England',   short: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    away: { name: 'USA',       short: 'USA', flag: '🇺🇸' },
    kickoff: daysAgo(9), result: { h: 2, a: 0, winner: 'ENG' },
  },
  {
    id: 'mock-5', stage: 'group', group: 'E',
    home: { name: 'Morocco',   short: 'MAR', flag: '🇲🇦' },
    away: { name: 'Senegal',   short: 'SEN', flag: '🇸🇳' },
    kickoff: daysAgo(8), result: { h: 0, a: 1, winner: 'SEN' },
  },
  {
    id: 'mock-6', stage: 'group', group: 'F',
    home: { name: 'Japan',       short: 'JPN', flag: '🇯🇵' },
    away: { name: 'South Korea', short: 'KOR', flag: '🇰🇷' },
    kickoff: daysAgo(7), result: { h: 2, a: 2, winner: null },
  },
  {
    id: 'mock-7', stage: 'group', group: 'G',
    home: { name: 'Netherlands', short: 'NED', flag: '🇳🇱' },
    away: { name: 'Belgium',     short: 'BEL', flag: '🇧🇪' },
    kickoff: daysAgo(6), result: { h: 1, a: 0, winner: 'NED' },
  },
  {
    id: 'mock-8', stage: 'group', group: 'H',
    home: { name: 'Mexico',  short: 'MEX', flag: '🇲🇽' },
    away: { name: 'Canada',  short: 'CAN', flag: '🇨🇦' },
    kickoff: daysAgo(5), result: { h: 2, a: 3, winner: 'CAN' },
  },
  // ── Upcoming ──────────────────────────────────────────────────────────────
  {
    id: 'mock-9',  stage: 'group', group: 'A',
    home: { name: 'France',    short: 'FRA', flag: '🇫🇷' },
    away: { name: 'Italy',     short: 'ITA', flag: '🇮🇹' },
    kickoff: daysFromNow(2),
  },
  {
    id: 'mock-10', stage: 'group', group: 'B',
    home: { name: 'Brazil',    short: 'BRA', flag: '🇧🇷' },
    away: { name: 'Colombia',  short: 'COL', flag: '🇨🇴' },
    kickoff: daysFromNow(3),
  },
  {
    id: 'mock-11', stage: 'group', group: 'C',
    home: { name: 'Spain',     short: 'ESP', flag: '🇪🇸' },
    away: { name: 'Croatia',   short: 'CRO', flag: '🇭🇷' },
    kickoff: daysFromNow(4),
  },
  {
    id: 'mock-12', stage: 'group', group: 'D',
    home: { name: 'England',   short: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    away: { name: 'Australia', short: 'AUS', flag: '🇦🇺' },
    kickoff: daysFromNow(5),
  },
]

// Each user's predictions per finished match [homeScore, awayScore]
// Ordered to produce a realistic spread: Alice leads, Bob 2nd, etc.
const PRED_MATRIX: Record<string, [number, number][]> = {
  //                      m1    m2    m3    m4    m5    m6    m7    m8
  'alice@mock.wc26':  [[2,1],[1,1],[3,0],[2,0],[0,1],[2,2],[1,0],[2,3]], // exact on all → max pts
  'bob@mock.wc26':    [[2,0],[0,0],[2,0],[1,0],[1,2],[1,1],[2,1],[1,2]], // mix of correct+wrong
  'carlos@mock.wc26': [[1,0],[2,2],[1,0],[3,1],[0,2],[1,1],[0,0],[1,1]], // some correct results
  'dana@mock.wc26':   [[0,0],[0,1],[2,1],[0,1],[1,0],[3,1],[0,1],[3,2]], // mostly wrong
}

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); d.setHours(18, 0, 0, 0); return d
}
function daysFromNow(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n); d.setHours(20, 0, 0, 0); return d
}

function calcPoints(
  pred: [number, number],
  result: { h: number; a: number; winner: string | null },
  cfg = { exactScore: 3, correctResult: 1 }
) {
  const [ph, pa] = pred
  if (ph === result.h && pa === result.a) return { pts: cfg.exactScore, exact: true, correct: true }
  const predWinner = ph > pa ? 'HOME' : pa > ph ? 'AWAY' : null
  const realWinner = result.h > result.a ? 'HOME' : result.a > result.h ? 'AWAY' : null
  if (predWinner === realWinner) return { pts: cfg.correctResult, exact: false, correct: true }
  return { pts: 0, exact: false, correct: false }
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url)
  const realEmail = url.searchParams.get('email')?.toLowerCase().trim()
  const reset = url.searchParams.get('reset') === 'true'

  await connectDB()

  // ── Optional reset ─────────────────────────────────────────────────────────
  if (reset) {
    await Promise.all([
      MatchModel.deleteMany({ apiMatchId: /^mock-/ }),
      LeagueModel.deleteOne({ slug: 'mock-amigos-fc' }),
    ])
    const mockEmails = MOCK_USERS.map(u => u.email)
    const mockUsers = await UserModel.find({ email: { $in: mockEmails } })
    const mockIds = mockUsers.map(u => u._id)
    await MembershipModel.deleteMany({ userId: { $in: mockIds } })
    await PredictionModel.deleteMany({ userId: { $in: mockIds } })
    await UserModel.deleteMany({ email: { $in: mockEmails } })
  }

  // ── Users ──────────────────────────────────────────────────────────────────
  const createdUsers: any[] = []
  for (const u of MOCK_USERS) {
    const existing = await UserModel.findOne({ email: u.email })
    if (existing) { createdUsers.push(existing); continue }
    const doc = await UserModel.create({
      email: u.email, name: u.name, avatar: u.avatar,
      authProvider: 'email', apiKey: nanoid(32), timezone: 'UTC',
    })
    createdUsers.push(doc)
  }

  // Add the real user as league owner (if provided and exists in DB)
  let realUser: any = null
  if (realEmail) {
    realUser = await UserModel.findOne({ email: realEmail })
    if (!realUser) {
      return NextResponse.json(
        { error: `User ${realEmail} not found. Sign in with Google first, then re-run the seed.` },
        { status: 404 }
      )
    }
  }

  const allMembers = realUser ? [realUser, ...createdUsers] : createdUsers
  const ownerId = realUser?._id ?? createdUsers[0]._id

  // ── League ─────────────────────────────────────────────────────────────────
  let league = await LeagueModel.findOne({ slug: 'mock-amigos-fc' })
  if (!league) {
    league = await LeagueModel.create({
      name: 'Amigos FC ⚽',
      slug: 'mock-amigos-fc',
      avatar: '',
      description: 'Mock league — seed data for testing',
      ownerId,
      status: 'active',
      cupStatus: 'pending',
      memberCount: allMembers.length,
      inviteTokens: [{ token: nanoid(32), expiresAt: new Date(Date.now() + 7 * 86400_000), usedBy: [] }],
    })
  }

  // ── Memberships ────────────────────────────────────────────────────────────
  for (const u of allMembers) {
    const exists = await MembershipModel.findOne({ userId: u._id, leagueId: league._id })
    if (!exists) {
      await MembershipModel.create({
        userId: u._id, leagueId: league._id,
        role: String(u._id) === String(ownerId) ? 'owner' : 'member',
        totalPoints: 0, rank: 0, joinedAt: new Date(),
      })
    }
  }

  // ── Matches ────────────────────────────────────────────────────────────────
  const matchDocs: any[] = []
  for (const m of MATCHES) {
    const kickoff = m.kickoff
    const lock = new Date(kickoff.getTime() - 15 * 60_000)
    const isFinished = !!m.result
    const upserted = await MatchModel.findOneAndUpdate(
      { apiMatchId: m.id },
      {
        apiMatchId: m.id,
        stage: m.stage,
        group: m.group,
        homeTeam: { apiId: m.home.short, name: m.home.name, shortName: m.home.short, logo: '', flag: m.home.flag },
        awayTeam: { apiId: m.away.short, name: m.away.name, shortName: m.away.short, logo: '', flag: m.away.flag },
        kickoffAt: kickoff,
        lockAt: lock,
        status: isFinished ? 'finished' : 'scheduled',
        ...(m.result ? {
          result: { homeScore: m.result.h, awayScore: m.result.a, winner: m.result.winner, isAfterExtraTime: false, isAfterPenalties: false },
          scoringCalculatedAt: new Date(),
        } : {}),
        venue: 'Estadio Nacional', city: 'Mock City',
      },
      { upsert: true, new: true }
    )
    matchDocs.push(upserted)
  }

  // ── Predictions + Points ───────────────────────────────────────────────────
  const finishedMatches = matchDocs.filter(m => m.status === 'finished')
  const pointsTally: Record<string, number> = {}
  const historyEntries: Record<string, any[]> = {}

  for (const u of createdUsers) {
    pointsTally[String(u._id)] = 0
    historyEntries[String(u._id)] = []
  }

  for (let mi = 0; mi < finishedMatches.length; mi++) {
    const match = finishedMatches[mi]
    const mockIdx = MATCHES.findIndex(m => m.id === match.apiMatchId)
    const result = MATCHES[mockIdx].result!

    for (const u of createdUsers) {
      const predArr = PRED_MATRIX[u.email]
      if (!predArr || !predArr[mi]) continue
      const pred = predArr[mi]
      const { pts, exact, correct } = calcPoints(pred, result)

      await PredictionModel.findOneAndUpdate(
        { userId: u._id, matchId: match._id, leagueId: league._id },
        {
          userId: u._id, matchId: match._id, leagueId: league._id,
          homeScore: pred[0], awayScore: pred[1],
          isLocked: true, pointsEarned: pts,
          breakdown: { exactScore: exact, correctResult: correct, correctTeamAdvancing: false },
          submittedAt: new Date(match.kickoffAt.getTime() - 3600_000),
        },
        { upsert: true, new: true }
      )

      pointsTally[String(u._id)] = (pointsTally[String(u._id)] ?? 0) + pts
      historyEntries[String(u._id)].push({
        matchId: match._id,
        pointsEarned: pts,
        cumulativePoints: pointsTally[String(u._id)],
        rankAtTime: 0,
        timestamp: new Date(),
      })
    }
  }

  // ── Update membership totals + ranks ───────────────────────────────────────
  const ranked = Object.entries(pointsTally)
    .sort(([, a], [, b]) => b - a)
    .map(([uid, pts], i) => ({ uid, pts, rank: i + 1 }))

  for (const { uid, pts, rank } of ranked) {
    const history = historyEntries[uid].map((h, i) => ({ ...h, rankAtTime: rank }))
    await MembershipModel.findOneAndUpdate(
      { userId: uid, leagueId: league._id },
      { totalPoints: pts, rank, pointsHistory: history }
    )
  }

  await LeagueModel.findByIdAndUpdate(league._id, { memberCount: allMembers.length })

  return NextResponse.json({
    ok: true,
    league: { name: league.name, slug: league.slug },
    members: ranked.map(r => {
      const u = allMembers.find(u => String(u._id) === r.uid)
      return { name: u?.name, email: u?.email, points: r.pts, rank: r.rank }
    }),
    matches: { finished: finishedMatches.length, upcoming: matchDocs.length - finishedMatches.length },
    tip: realEmail
      ? `Sign in as ${realEmail} → you'll see "Amigos FC ⚽" in your sidebar`
      : `Visit /leagues/mock-amigos-fc after signing in, or re-run with ?email=your@email.com`,
  })
}
