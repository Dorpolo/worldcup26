'use client'

import Link from 'next/link'
import { useLeaderboard, type LeaderboardEntry } from '@/hooks/useLeaderboard'
import { useDraggable } from '@/hooks/useDraggable'

interface Entry extends LeaderboardEntry {
  role?: string
  exactMatches?: number
  gamesPlayed?: number
  bonusPoints?: number
}

interface Props { leagueId: string; leagueSlug: string; initial: Entry[] }

export function LeaderboardClient({ leagueId, leagueSlug, initial }: Props) {
  const { entries, lastUpdate, isAnimating } = useLeaderboard(leagueId, initial)

  return (
    <div className="h-full overflow-y-auto p-5">
      {/* Header */}
      <div className="space-y-4 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: 'rgb(var(--c-text-1))' }}>League Standings</h2>
            <p className="text-[11px] mt-1" style={{ color: 'rgb(var(--c-text-3))' }}>
              {entries.length} members competing
            </p>
          </div>
          {lastUpdate && (
            <div className="flex items-center gap-1.5 text-[11px]"
              style={{ color: isAnimating ? 'rgb(63 185 80)' : 'rgb(var(--c-text-3))' }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ background: isAnimating ? 'rgb(63 185 80)' : 'rgb(var(--c-surface-3))' }} />
              {isAnimating ? 'Live' : lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'rgb(var(--c-text-3))' }}>
          <div className="col-span-1">Rank</div>
          <div className="col-span-5">Player</div>
          <div className="col-span-1 text-center">Exact</div>
          <div className="col-span-1 text-center">Played</div>
          <div className="col-span-1 text-center">Bonus</div>
          <div className="col-span-2 text-right">Points</div>
        </div>
      </div>

      {/* Leaderboard Entries */}
      <div className="space-y-2">
        {(entries as Entry[]).map((m) => (
          <DraggableUserRow
            key={m.userId}
            entry={m}
            leagueSlug={leagueSlug}
            isAnimating={isAnimating}
          />
        ))}

        {(entries as Entry[]).length === 0 && (
          <div className="text-center py-16 space-y-2">
            <p className="text-2xl">🏆</p>
            <p className="text-sm" style={{ color: 'rgb(var(--c-text-3))' }}>No scores yet</p>
            <p className="text-[11px]" style={{ color: 'rgb(var(--c-surface-3))' }}>Leaderboard updates after matches finish</p>
          </div>
        )}
      </div>
    </div>
  )
}

function DraggableUserRow({ entry, leagueSlug, isAnimating }: {
  entry: Entry
  leagueSlug: string
  isAnimating: boolean
}) {
  const drag = useDraggable({
    type: 'user',
    id: entry.userId,
    label: entry.name ?? 'User',
    meta: { rank: entry.rank, points: entry.totalPoints },
  })

  const medalEmoji = entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : null

  return (
    <div
      {...drag}
      className={`relative rounded-lg transition-all duration-500 cursor-grab active:cursor-grabbing ${isAnimating && entry.isMe ? 'animate-rank-up' : ''}`}
      style={{
        background: entry.isMe ? 'rgb(217 119 87 / 0.07)' : 'rgb(var(--c-overlay-xs))',
        border: entry.isMe ? '1px solid rgb(217 119 87 / 0.2)' : '1px solid rgb(var(--c-border-soft))',
      }}
    >
      <Link
        href={`/leagues/${leagueSlug}/predictions?userId=${entry.userId}`}
        className="grid grid-cols-12 gap-2 px-4 py-3 hover:brightness-105"
      >
        {/* Rank Badge */}
        <div className="col-span-1 flex items-center justify-center">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
            style={{
              background: entry.rank === 1 ? 'rgb(245 200 66 / 0.15)'
                         : entry.rank === 2 ? 'rgb(160 160 160 / 0.15)'
                         : entry.rank === 3 ? 'rgb(200 117 51 / 0.15)'
                         : 'rgb(var(--c-overlay-md))',
              color: entry.rank === 1 ? '#f5c842'
                   : entry.rank === 2 ? '#a0a0a0'
                   : entry.rank === 3 ? '#c87533'
                   : 'rgb(var(--c-surface-3))',
            }}
          >
            {medalEmoji ? medalEmoji : `${entry.rank}`}
          </div>
        </div>

        {/* Player Info */}
        <div className="col-span-5 flex items-center gap-3 min-w-0">
          {/* Avatar */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden"
            style={{ background: 'rgb(217 119 87 / 0.15)', color: 'rgb(217 119 87)' }}
          >
            {entry.avatar
              ? <img src={entry.avatar} alt="" className="w-full h-full object-cover" />
              : entry.name?.charAt(0).toUpperCase()}
          </div>

          {/* Name */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'rgb(var(--c-text-1))' }}>
              {entry.name}
            </p>
            <p className="text-[10px]" style={{ color: 'rgb(var(--c-text-3))' }}>
              {(entry as Entry).role === 'owner' ? 'Owner' : 'Member'}
              {entry.isMe && ' • You'}
            </p>
          </div>
        </div>

        {/* Exact Matches */}
        <div className="col-span-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[12px] font-bold" style={{ color: 'rgb(63 185 80)' }}>
              {(entry as Entry).exactMatches || 0}
            </p>
            <p className="text-[8px]" style={{ color: 'rgb(var(--c-text-3))' }}>exact</p>
          </div>
        </div>

        {/* Games Played */}
        <div className="col-span-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[12px] font-bold" style={{ color: 'rgb(var(--c-text-1))' }}>
              {(entry as Entry).gamesPlayed || 0}
            </p>
            <p className="text-[8px]" style={{ color: 'rgb(var(--c-text-3))' }}>played</p>
          </div>
        </div>

        {/* Bonus Points */}
        <div className="col-span-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[12px] font-bold" style={{ color: 'rgb(217 119 87)' }}>
              +{(entry as Entry).bonusPoints || 0}
            </p>
            <p className="text-[8px]" style={{ color: 'rgb(var(--c-text-3))' }}>bonus</p>
          </div>
        </div>

        {/* Total Points */}
        <div className="col-span-2 flex items-center justify-end">
          <div className="text-right">
            <p
              className="font-bold text-lg font-mono transition-colors duration-500"
              style={{ color: isAnimating ? 'rgb(63 185 80)' : 'rgb(var(--c-text-1))' }}
            >
              {entry.totalPoints}
            </p>
            <p className="text-[10px]" style={{ color: 'rgb(var(--c-text-3))' }}>pts</p>
          </div>
        </div>
      </Link>

      {/* Drag hint */}
      <div
        className="absolute top-1.5 right-1.5 text-[9px] px-1.5 py-0.5 rounded pointer-events-none opacity-0 group-hover:opacity-100"
        style={{ color: 'rgb(var(--c-text-3))', background: 'rgb(var(--c-overlay-md))' }}
      >
        ⠿ drag to chat
      </div>
    </div>
  )
}
