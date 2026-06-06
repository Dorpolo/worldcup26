'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Loader2 } from 'lucide-react'

interface Props {
  leagueId: string
  leagueSlug: string
}

export function TournamentContext({ leagueId, leagueSlug }: Props) {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchContext = async () => {
      try {
        // Fetch from the internal context endpoint if it exists
        // Otherwise, we'll fetch data from individual endpoints
        const [standingsRes, matchesRes, scorersRes] = await Promise.all([
          fetch(`/api/leagues/${leagueId}/standings`),
          fetch(`/api/matches/upcoming?hours=48`),
          fetch(`/api/players?limit=5&sort=-stats.goals`),
        ])

        const standings = standingsRes.ok ? await standingsRes.json() : null
        const matches = matchesRes.ok ? await matchesRes.json() : null
        const scorers = scorersRes.ok ? await scorersRes.json() : null

        setData({
          standings: standings?.data,
          upcomingMatch: matches?.data?.[0],
          topScorers: scorers?.data?.players,
        })
      } catch (err) {
        console.error('Failed to fetch tournament context:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchContext()
  }, [leagueId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'rgb(var(--c-text-3))' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Next Match */}
      {data?.upcomingMatch && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgb(var(--c-text-3))' }}>
            Next Match
          </h3>
          <div
            className="rounded-lg p-3"
            style={{ background: 'rgb(var(--c-overlay-sm))' }}
          >
            <div className="flex items-center gap-2 text-[10px] mb-2" style={{ color: 'rgb(var(--c-text-3))' }}>
              <span>
                {new Date(data.upcomingMatch.kickoffAt).toLocaleDateString('en-GB', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span>
                {new Date(data.upcomingMatch.kickoffAt).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1">
                <p className="text-[12px] font-semibold text-right" style={{ color: 'rgb(var(--c-text-1))' }}>
                  {data.upcomingMatch.homeTeam?.name}
                </p>
              </div>
              <span className="text-[10px]" style={{ color: 'rgb(var(--c-text-3))' }}>
                vs
              </span>
              <div className="flex-1">
                <p className="text-[12px] font-semibold" style={{ color: 'rgb(var(--c-text-1))' }}>
                  {data.upcomingMatch.awayTeam?.name}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Standings Preview */}
      {data?.standings?.groups && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgb(var(--c-text-3))' }}>
              Standings
            </h3>
            <button
              onClick={() => router.push(`/leagues/${leagueSlug}/standings`)}
              className="p-0.5 rounded transition-colors hover:opacity-75"
              style={{ color: 'rgb(217 119 87)' }}
              title="View full standings"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Show first group */}
          {Object.entries(data.standings.groups)[0] && (
            <div className="space-y-1">
              {(() => {
                const [groupName, teams]: any = Object.entries(data.standings.groups)[0]
                return (
                  <>
                    <p className="text-[10px] font-semibold" style={{ color: 'rgb(var(--c-text-2))' }}>
                      Group {groupName}
                    </p>
                    <div className="space-y-1">
                      {(teams as any[]).slice(0, 2).map((team: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[10px] px-2 py-1.5 rounded"
                          style={{ background: 'rgb(var(--c-overlay-xs))' }}
                        >
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {team.team?.logo && (
                              <img
                                src={team.team.logo}
                                alt=""
                                className="w-4 h-4 object-contain shrink-0"
                              />
                            )}
                            <span
                              className="font-medium truncate"
                              style={{ color: 'rgb(var(--c-text-1))' }}
                            >
                              {team.team?.name}
                            </span>
                          </div>
                          <span
                            className="font-bold ml-1"
                            style={{ color: 'rgb(var(--c-text-2))' }}
                          >
                            {team.points}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )
              })()}
            </div>
          )}
        </div>
      )}

      {/* Top Scorers */}
      {data?.topScorers && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgb(var(--c-text-3))' }}>
            Top Scorers
          </h3>
          <div className="space-y-1">
            {data.topScorers.slice(0, 3).map((player: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between text-[10px] px-2 py-1.5 rounded"
                style={{ background: 'rgb(var(--c-overlay-xs))' }}
              >
                <div className="flex-1 min-w-0">
                  <p
                    className="font-semibold truncate"
                    style={{ color: 'rgb(var(--c-text-1))' }}
                  >
                    {player.name}
                  </p>
                  <p
                    className="text-[9px] truncate"
                    style={{ color: 'rgb(var(--c-text-3))' }}
                  >
                    {player.team}
                  </p>
                </div>
                <span
                  className="font-bold ml-1 text-[11px]"
                  style={{ color: 'rgb(63 185 80)' }}
                >
                  {player.stats?.goals || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="pt-2 border-t" style={{ borderColor: 'rgb(var(--c-border-subtle))' }}>
        <button
          onClick={() => router.push(`/leagues/${leagueSlug}/standings`)}
          className="w-full text-[10px] font-semibold px-3 py-2 rounded-lg transition-colors"
          style={{
            background: 'rgb(217 119 87 / 0.1)',
            color: 'rgb(217 119 87)',
          }}
        >
          View Full Standings →
        </button>
      </div>
    </div>
  )
}
