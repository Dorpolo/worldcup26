'use client'

import { useEffect, useState, useCallback } from 'react'

interface DistributionEntry {
  userId: string
  name: string
  avatar: string
  homeScore: number
  awayScore: number
  pointsEarned?: number
  isLocked: boolean
  rank: number
  totalPoints: number
  isMe: boolean
}

interface DistributionData {
  match: {
    homeTeam: { name: string; shortName: string; flag?: string }
    awayTeam: { name: string; shortName: string; flag?: string }
    status: string
    result?: { homeScore: number; awayScore: number }
  }
  distribution: {
    homeWins: number
    draws: number
    awayWins: number
    total: number
    homeWinPct: number
    drawPct: number
    awayWinPct: number
  }
  entries: DistributionEntry[]
}

interface Props {
  matchId: string
  leagueSlug: string
  leagueMongoId: string
  onClose: () => void
}

export function MatchDistributionModal({ matchId, leagueSlug, leagueMongoId, onClose }: Props) {
  const [data, setData] = useState<DistributionData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/leagues/${leagueSlug}/matches/${matchId}/predictions`)
      const json = await res.json()
      if (json.ok) setData(json.data)
    } finally {
      setLoading(false)
    }
  }, [matchId, leagueSlug])

  useEffect(() => { load() }, [load])

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  const home = data?.match.homeTeam
  const away = data?.match.awayTeam
  const dist = data?.distribution
  const isFinished = data?.match.status === 'finished'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgb(0 0 0 / 0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'rgb(30 28 26)',
          border: '1px solid rgb(255 255 255 / 0.1)',
          maxHeight: '85vh',
        }}
      >
        {/* Header */}
        <div
          className="shrink-0 flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgb(255 255 255 / 0.07)' }}
        >
          <div>
            <p className="text-[13px] font-semibold" style={{ color: 'rgb(240 235 227)' }}>
              {loading ? 'Loading…' : home && away ? `${home.shortName} vs ${away.shortName}` : 'Match'}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgb(107 100 92)' }}>
              Prediction distribution
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-lg leading-none transition-opacity hover:opacity-60"
            style={{ color: 'rgb(107 100 92)', background: 'rgb(255 255 255 / 0.05)' }}
          >
            ×
          </button>
        </div>

        {loading && (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="w-5 h-5 border-[1.5px] rounded-full animate-spin"
              style={{ borderColor: 'rgb(58 55 51)', borderTopColor: 'rgb(217 119 87)' }} />
          </div>
        )}

        {!loading && data && (
          <div className="flex-1 overflow-y-auto">
            {/* Result (if finished) */}
            {isFinished && data.match.result && (
              <div className="flex items-center justify-center gap-6 px-5 py-4"
                style={{ borderBottom: '1px solid rgb(255 255 255 / 0.07)' }}>
                <span className="text-[13px] font-semibold" style={{ color: 'rgb(240 235 227)' }}>
                  {home?.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold font-mono" style={{ color: 'rgb(240 235 227)' }}>
                    {data.match.result.homeScore}
                  </span>
                  <span style={{ color: 'rgb(58 55 51)' }}>—</span>
                  <span className="text-2xl font-bold font-mono" style={{ color: 'rgb(240 235 227)' }}>
                    {data.match.result.awayScore}
                  </span>
                </div>
                <span className="text-[13px] font-semibold" style={{ color: 'rgb(240 235 227)' }}>
                  {away?.name}
                </span>
              </div>
            )}

            {/* Distribution bars */}
            {dist && dist.total > 0 && (
              <div className="px-5 py-4" style={{ borderBottom: '1px solid rgb(255 255 255 / 0.07)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-3"
                  style={{ color: 'rgb(107 100 92)' }}>
                  {dist.total} prediction{dist.total !== 1 ? 's' : ''}
                </p>
                <div className="space-y-2">
                  {[
                    { label: home?.shortName ?? 'Home', pct: dist.homeWinPct, count: dist.homeWins, color: 'rgb(217 119 87)' },
                    { label: 'Draw', pct: dist.drawPct, count: dist.draws, color: 'rgb(107 100 92)' },
                    { label: away?.shortName ?? 'Away', pct: dist.awayWinPct, count: dist.awayWins, color: 'rgb(99 149 245)' },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-2">
                      <span className="text-[11px] w-8 text-right shrink-0" style={{ color: 'rgb(107 100 92)' }}>
                        {row.label}
                      </span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgb(255 255 255 / 0.05)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${row.pct}%`, background: row.color }}
                        />
                      </div>
                      <span className="text-[11px] w-10 shrink-0 font-mono" style={{ color: 'rgb(160 152 144)' }}>
                        {row.pct}% ({row.count})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Member predictions list */}
            <div className="divide-y" style={{ borderColor: 'rgb(255 255 255 / 0.04)' }}>
              {data.entries.length === 0 && (
                <p className="text-[12px] text-center py-8" style={{ color: 'rgb(107 100 92)' }}>
                  No predictions yet
                </p>
              )}
              {data.entries.map((entry) => (
                <div
                  key={entry.userId}
                  className="flex items-center gap-3 px-5 py-3"
                  style={{
                    background: entry.isMe ? 'rgb(217 119 87 / 0.04)' : undefined,
                  }}
                >
                  {/* Rank */}
                  <span className="text-[11px] font-bold w-5 text-center shrink-0"
                    style={{ color: entry.rank === 1 ? '#f5c842' : entry.rank === 2 ? '#a0a0a0' : entry.rank === 3 ? '#c87533' : 'rgb(58 55 51)' }}>
                    {entry.rank > 0 ? (entry.rank <= 3 ? ['🥇','🥈','🥉'][entry.rank - 1] : `#${entry.rank}`) : '—'}
                  </span>

                  {/* Avatar */}
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden"
                    style={{ background: 'rgb(217 119 87 / 0.15)', color: 'rgb(217 119 87)' }}>
                    {entry.avatar
                      ? <img src={entry.avatar} alt="" className="w-full h-full object-cover" />
                      : entry.name.charAt(0)}
                  </div>

                  {/* Name */}
                  <p className="flex-1 text-[12px] font-medium truncate" style={{ color: entry.isMe ? 'rgb(240 235 227)' : 'rgb(160 152 144)' }}>
                    {entry.name}
                    {entry.isMe && (
                      <span className="ml-1 text-[10px]" style={{ color: 'rgb(217 119 87)' }}>you</span>
                    )}
                  </p>

                  {/* Prediction */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono text-[13px] font-bold" style={{ color: 'rgb(240 235 227)' }}>
                      {entry.homeScore}–{entry.awayScore}
                    </span>
                    {entry.pointsEarned != null && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono"
                        style={entry.pointsEarned > 0
                          ? { background: 'rgb(63 185 80 / 0.15)', color: 'rgb(63 185 80)' }
                          : { background: 'rgb(255 255 255 / 0.05)', color: 'rgb(107 100 92)' }
                        }
                      >
                        {entry.pointsEarned > 0 ? `+${entry.pointsEarned}` : '0'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
