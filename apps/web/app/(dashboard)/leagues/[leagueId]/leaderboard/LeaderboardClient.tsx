'use client'

import { useLeaderboard, type LeaderboardEntry } from '@/hooks/useLeaderboard'

interface Entry extends LeaderboardEntry { role?: string }
interface Props { leagueId: string; initial: Entry[] }

export function LeaderboardClient({ leagueId, initial }: Props) {
  const { entries, lastUpdate, isAnimating } = useLeaderboard(leagueId, initial)

  return (
    <div className="h-full overflow-y-auto p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold" style={{ color: 'rgb(240 235 227)' }}>Leaderboard</h2>
          <p className="text-[11px] mt-0.5" style={{ color: 'rgb(107 100 92)' }}>
            {entries.length} members competing
          </p>
        </div>
        {lastUpdate && (
          <div className="flex items-center gap-1.5 text-[11px]"
            style={{ color: isAnimating ? 'rgb(63 185 80)' : 'rgb(107 100 92)' }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block"
              style={{ background: isAnimating ? 'rgb(63 185 80)' : 'rgb(58 55 51)' }} />
            {isAnimating ? 'Live' : lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="space-y-1.5 max-w-2xl">
        {(entries as Entry[]).map((m) => (
          <div
            key={m.userId}
            className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-500 ${isAnimating && m.isMe ? 'animate-rank-up' : ''}`}
            style={{
              background: m.isMe ? 'rgb(217 119 87 / 0.07)' : 'rgb(255 255 255 / 0.03)',
              border: m.isMe ? '1px solid rgb(217 119 87 / 0.2)' : '1px solid rgb(255 255 255 / 0.06)',
            }}
          >
            {/* Rank */}
            <div className="w-7 text-center shrink-0 font-bold text-sm"
              style={{
                color: m.rank === 1 ? '#f5c842'
                     : m.rank === 2 ? '#a0a0a0'
                     : m.rank === 3 ? '#c87533'
                     : 'rgb(58 55 51)',
              }}>
              {m.rank <= 3 ? ['🥇','🥈','🥉'][m.rank - 1] : `#${m.rank}`}
            </div>

            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden"
              style={{ background: 'rgb(217 119 87 / 0.15)', color: 'rgb(217 119 87)' }}
            >
              {m.avatar
                ? <img src={m.avatar} alt="" className="w-full h-full object-cover" />
                : m.name?.charAt(0).toUpperCase()
              }
            </div>

            {/* Name / role */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'rgb(240 235 227)' }}>
                {m.name}
                {m.isMe && (
                  <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgb(217 119 87 / 0.15)', color: 'rgb(217 119 87)' }}>
                    you
                  </span>
                )}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgb(107 100 92)' }}>
                {m.role === 'owner' ? 'Owner' : 'Member'}
              </p>
            </div>

            {/* Points */}
            <div className="text-right shrink-0">
              <p
                className="font-bold text-lg font-mono transition-colors duration-500"
                style={{ color: isAnimating ? 'rgb(63 185 80)' : 'rgb(240 235 227)' }}
              >
                {m.totalPoints}
              </p>
              <p className="text-[10px]" style={{ color: 'rgb(107 100 92)' }}>pts</p>
            </div>
          </div>
        ))}

        {entries.length === 0 && (
          <div className="text-center py-16 space-y-2">
            <p className="text-2xl">🏆</p>
            <p className="text-sm" style={{ color: 'rgb(107 100 92)' }}>No scores yet</p>
            <p className="text-[11px]" style={{ color: 'rgb(58 55 51)' }}>Leaderboard updates after matches finish</p>
          </div>
        )}
      </div>
    </div>
  )
}
