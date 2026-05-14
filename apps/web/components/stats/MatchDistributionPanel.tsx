'use client'

import { useState } from 'react'

interface DistributionEntry { score: string; count: number }
interface MemberBreakdown {
  userId: string
  name: string
  homeScore: number
  awayScore: number
  pointsEarned: number | null
  exactScore: boolean
  correctResult: boolean
}

interface MatchData {
  match: {
    homeTeam: { shortName: string }
    awayTeam: { shortName: string }
    result: { homeScore: number; awayScore: number } | null
    status: string
  }
  distribution: DistributionEntry[]
  memberBreakdown: MemberBreakdown[]
  totals: { predicted: number; exact: number; correctResult: number; wrong: number }
}

interface Props {
  matchId: string
  leagueId: string
  matchLabel: string
}

export function MatchDistributionPanel({ matchId, leagueId, matchLabel }: Props) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<MatchData | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleOpen() {
    setOpen(true)
    if (data) return
    setLoading(true)
    try {
      const res = await fetch(`/api/leagues/${leagueId}/stats/match/${matchId}`)
      const json = await res.json()
      if (json.ok) setData(json.data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="text-[11px] px-2.5 py-1 rounded-lg transition-colors hover:opacity-80"
        style={{ background: 'rgb(255 255 255 / 0.05)', color: 'rgb(160 152 144)', border: '1px solid rgb(255 255 255 / 0.07)' }}
      >
        {matchLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgb(0 0 0 / 0.6)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md max-h-[80vh] overflow-y-auto"
            style={{
              background: 'rgb(30 28 26)',
              border: '1px solid rgb(255 255 255 / 0.1)',
              borderRadius: '20px',
              boxShadow: '0 24px 64px rgb(0 0 0 / 0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="sticky top-0 px-4 py-3 flex items-center justify-between"
              style={{ background: 'rgb(30 28 26)', borderBottom: '1px solid rgb(255 255 255 / 0.07)' }}
            >
              <h3 className="text-[13px] font-semibold" style={{ color: 'rgb(240 235 227)' }}>
                {data ? `${data.match.homeTeam.shortName} vs ${data.match.awayTeam.shortName}` : matchLabel}
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-lg leading-none transition-opacity hover:opacity-60"
                style={{ color: 'rgb(107 100 92)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            {loading && (
              <div className="p-8 text-center text-[13px]" style={{ color: 'rgb(107 100 92)' }}>Loading…</div>
            )}

            {data && !loading && (
              <div className="p-4 space-y-4">
                {/* Final score */}
                {data.match.result && (
                  <div className="text-center py-2">
                    <span className="text-3xl font-bold font-mono" style={{ color: 'rgb(240 235 227)' }}>
                      {data.match.result.homeScore} – {data.match.result.awayScore}
                    </span>
                    <p className="text-[11px] mt-0.5" style={{ color: 'rgb(107 100 92)' }}>Final score</p>
                  </div>
                )}

                {/* Totals */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'Exact', value: data.totals.exact, color: 'rgb(63 185 80)' },
                    { label: 'Result', value: data.totals.correctResult, color: 'rgb(99 155 255)' },
                    { label: 'Miss', value: data.totals.wrong, color: 'rgb(107 100 92)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-xl p-2.5" style={{ background: 'rgb(255 255 255 / 0.04)', border: '1px solid rgb(255 255 255 / 0.06)' }}>
                      <p className="text-base font-bold" style={{ color }}>{value}</p>
                      <p className="text-[10px]" style={{ color: 'rgb(107 100 92)' }}>{label}</p>
                    </div>
                  ))}
                </div>

                {/* Distribution */}
                {data.distribution.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: 'rgb(107 100 92)' }}>
                      Score distribution
                    </p>
                    <div className="space-y-1.5">
                      {data.distribution.map((d) => (
                        <div key={d.score} className="flex items-center gap-2 text-[11px]">
                          <span className="w-10 text-center font-mono" style={{ color: 'rgb(160 152 144)' }}>{d.score}</span>
                          <div className="flex-1 rounded-full h-1.5 overflow-hidden" style={{ background: 'rgb(255 255 255 / 0.06)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${(d.count / data.totals.predicted) * 100}%`, background: 'rgb(217 119 87)' }}
                            />
                          </div>
                          <span className="w-4 text-right" style={{ color: 'rgb(107 100 92)' }}>{d.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Per-member */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: 'rgb(107 100 92)' }}>
                    Who predicted what
                  </p>
                  <div>
                    {data.memberBreakdown.map((m) => (
                      <div
                        key={m.userId}
                        className="flex items-center justify-between py-2"
                        style={{ borderBottom: '1px solid rgb(255 255 255 / 0.04)' }}
                      >
                        <span className="text-[12px] truncate" style={{ color: 'rgb(240 235 227)' }}>{m.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-mono" style={{ color: 'rgb(160 152 144)' }}>{m.homeScore}–{m.awayScore}</span>
                          {m.exactScore && <span className="text-[10px] font-semibold" style={{ color: 'rgb(63 185 80)' }}>Exact</span>}
                          {!m.exactScore && m.correctResult && <span className="text-[10px] font-semibold" style={{ color: 'rgb(99 155 255)' }}>Result</span>}
                          {m.pointsEarned != null && (
                            <span className="text-[11px] font-bold" style={{ color: m.pointsEarned > 0 ? 'rgb(63 185 80)' : 'rgb(107 100 92)' }}>
                              {m.pointsEarned > 0 ? `+${m.pointsEarned}` : '0'} pts
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
