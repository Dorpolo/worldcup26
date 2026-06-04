import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { connectDB, UserModel, LeagueModel, MembershipModel } from '@worldcup26/db'
import { fetchStandings } from '@/lib/football-api'

interface Props {
  params: { leagueId: string }
}

export default async function StandingsPage({ params }: Props) {
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
  }).lean()
  if (!membership) redirect('/leagues')

  let standings = null
  let error = null

  try {
    const rawStandings = await fetchStandings()
    standings = transformStandings(rawStandings as any)
  } catch (err) {
    error = 'Failed to load tournament standings'
    console.error('Standings fetch error:', err)
  }

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold" style={{ color: 'rgb(var(--c-text-1))' }}>
            Tournament Standings
          </h1>
          <p className="text-sm" style={{ color: 'rgb(var(--c-text-3))' }}>
            World Cup 2026 group stage standings and qualification zones
          </p>
        </div>

        {error && (
          <div
            className="px-4 py-3 rounded-xl text-sm"
            style={{
              background: 'rgb(248 81 73 / 0.08)',
              border: '1px solid rgb(248 81 73 / 0.2)',
              color: 'rgb(248 81 73)',
            }}
          >
            {error}
          </div>
        )}

        {standings && standings.groups && (
          <div className="space-y-6">
            {Object.entries(standings.groups).map(([groupName, teams]: any) => (
              <div key={groupName}>
                {/* Group Header */}
                <div className="mb-3">
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: 'rgb(var(--c-text-1))' }}
                  >
                    Group {groupName}
                  </h2>
                </div>

                {/* Group Table */}
                <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'rgb(var(--c-border-normal))' }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: 'rgb(var(--c-overlay-sm))' }}>
                        <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--c-text-3))' }}>
                          Rank
                        </th>
                        <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--c-text-3))' }}>
                          Team
                        </th>
                        <th className="px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--c-text-3))' }}>
                          MP
                        </th>
                        <th className="px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--c-text-3))' }}>
                          W
                        </th>
                        <th className="px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--c-text-3))' }}>
                          D
                        </th>
                        <th className="px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--c-text-3))' }}>
                          L
                        </th>
                        <th className="px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--c-text-3))' }}>
                          GD
                        </th>
                        <th className="px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--c-text-3))' }}>
                          Pts
                        </th>
                        <th className="px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--c-text-3))' }}>
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map((team: any, idx: number) => (
                        <tr
                          key={idx}
                          className="border-t transition-colors hover:opacity-75"
                          style={{ borderColor: 'rgb(var(--c-border-subtle))' }}
                        >
                          <td className="px-4 py-3 text-center">
                            <span className="text-[12px] font-bold" style={{ color: 'rgb(var(--c-text-1))' }}>
                              {team.rank}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {team.team?.logo && (
                                <img
                                  src={team.team.logo}
                                  alt={team.team.name}
                                  className="w-5 h-5 object-contain"
                                />
                              )}
                              <span
                                className="text-[12px] font-semibold"
                                style={{ color: 'rgb(var(--c-text-1))' }}
                              >
                                {team.team?.name || 'Unknown'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-[11px]" style={{ color: 'rgb(var(--c-text-2))' }}>
                            {team.playedGames}
                          </td>
                          <td className="px-4 py-3 text-center text-[11px]" style={{ color: 'rgb(63 185 80)' }}>
                            {team.won}
                          </td>
                          <td className="px-4 py-3 text-center text-[11px]" style={{ color: 'rgb(var(--c-text-2))' }}>
                            {team.draw}
                          </td>
                          <td className="px-4 py-3 text-center text-[11px]" style={{ color: 'rgb(248 81 73)' }}>
                            {team.lost}
                          </td>
                          <td className="px-4 py-3 text-center text-[11px]" style={{ color: 'rgb(var(--c-text-2))' }}>
                            {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className="text-[12px] font-bold"
                              style={{ color: 'rgb(var(--c-text-1))' }}
                            >
                              {team.points}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge zone={team.qualificationZone} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="rounded-lg p-4" style={{ background: 'rgb(var(--c-overlay-xs))' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'rgb(var(--c-text-1))' }}>
            Qualification Zones
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-start gap-2">
              <div
                className="w-3 h-3 rounded-sm mt-1 shrink-0"
                style={{ background: 'rgb(63 185 80)' }}
              />
              <div className="text-xs" style={{ color: 'rgb(var(--c-text-2))' }}>
                <p className="font-semibold">Qualified</p>
                <p>Top 2 teams advance</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div
                className="w-3 h-3 rounded-sm mt-1 shrink-0"
                style={{ background: 'rgb(240 160 48)' }}
              />
              <div className="text-xs" style={{ color: 'rgb(var(--c-text-2))' }}>
                <p className="font-semibold">Best 3rd Place</p>
                <p>May advance as best 3rd</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div
                className="w-3 h-3 rounded-sm mt-1 shrink-0"
                style={{ background: 'rgb(248 81 73)' }}
              />
              <div className="text-xs" style={{ color: 'rgb(var(--c-text-2))' }}>
                <p className="font-semibold">Eliminated</p>
                <p>4th place finishes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ zone }: { zone: string }) {
  const styles = {
    qualify: { background: 'rgb(63 185 80 / 0.15)', color: 'rgb(63 185 80)', label: '✓' },
    best_third: { background: 'rgb(240 160 48 / 0.15)', color: 'rgb(240 160 48)', label: '↓' },
    eliminated: { background: 'rgb(248 81 73 / 0.15)', color: 'rgb(248 81 73)', label: '✗' },
  }

  const style = styles[zone as keyof typeof styles] || styles.eliminated

  return (
    <div
      className="px-2 py-1 rounded text-[10px] font-semibold inline-block"
      style={{ background: style.background, color: style.color }}
    >
      {style.label}
    </div>
  )
}

function transformStandings(rawStandings: any) {
  if (!Array.isArray(rawStandings)) {
    return { groups: {} }
  }

  const groups: Record<string, any[]> = {}

  for (const standing of rawStandings) {
    const group = standing.group
    if (!group) continue

    if (!groups[group]) {
      groups[group] = []
    }

    for (const teamStanding of standing.standings?.[0]?.table || []) {
      groups[group].push({
        rank: teamStanding.position,
        team: {
          id: teamStanding.team?.id,
          name: teamStanding.team?.name,
          logo: teamStanding.team?.logo,
          crest: teamStanding.team?.crest,
        },
        playedGames: teamStanding.playedGames,
        won: teamStanding.won,
        draw: teamStanding.draw,
        lost: teamStanding.lost,
        points: teamStanding.points,
        goalsFor: teamStanding.goalsFor,
        goalsAgainst: teamStanding.goalsDifference + teamStanding.goalsAgainst,
        goalDifference: teamStanding.goalDifference,
        qualificationZone: getQualificationZone(teamStanding.position),
      })
    }
  }

  for (const group in groups) {
    groups[group].sort((a, b) => a.rank - b.rank)
  }

  return { groups }
}

function getQualificationZone(position: number): string {
  if (position <= 2) return 'qualify'
  if (position === 3) return 'best_third'
  return 'eliminated'
}
