'use client'

import { useState, useTransition } from 'react'
import { MENTION_DRAG_KEY } from '@/lib/mention-types'

interface Matchup {
  _id: string
  homeUserId: string
  awayUserId: string | null
  homeUserName?: string
  awayUserName?: string | null
  homePoints: number
  awayPoints: number
  winnerId?: string
  isBye: boolean
}

interface Round {
  roundNumber: number
  roundName: string
  worldCupStage: string
  status: string
  matchups: Matchup[]
}

interface Bracket {
  _id: string
  status: string
  startRound: string
  rounds: Round[]
  winnerId?: string
}

interface Props {
  bracket: Bracket | null
  userMap: Record<string, { name: string; avatar?: string }>
  currentUserId: string
  isOwner: boolean
  leagueId: string
  leagueSlug: string
  memberCount: number
}

export function CupBracketView({ bracket, userMap, currentUserId, isOwner, leagueId, leagueSlug, memberCount }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isAdvancing, startAdvanceTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [localBracket, setLocalBracket] = useState(bracket)

  function getDisplayName(userId: string | null, fallback?: string | null): string {
    if (!userId) return 'BYE'
    return userMap[userId]?.name ?? fallback ?? 'Unknown'
  }

  function isMe(userId: string | null): boolean {
    return !!userId && userId === currentUserId
  }

  async function handleDraw() {
    setError(null)
    startTransition(async () => {
      const res = await fetch(`/api/leagues/${leagueId}/cup/draw`, { method: 'POST' })
      const json = await res.json()
      if (!json.ok) { setError(json.error ?? 'Failed to draw cup'); return }
      setLocalBracket(json.data)
    })
  }

  async function handleAdvance() {
    setError(null)
    startAdvanceTransition(async () => {
      const res = await fetch(`/api/leagues/${leagueId}/cup/advance`, { method: 'POST' })
      const json = await res.json()
      if (!json.ok) { setError(json.error ?? 'Failed to advance round'); return }
      setLocalBracket(json.data ?? null)
    })
  }

  if (!localBracket) {
    return (
      <div
        className="rounded-2xl p-10 text-center space-y-5"
        style={{ background: 'rgb(36 34 32)', border: '1px solid rgb(255 255 255 / 0.07)' }}
      >
        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl" style={{ background: 'rgb(217 119 87 / 0.1)' }}>
          🏆
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold" style={{ color: 'rgb(240 235 227)' }}>Cup draw not done yet</h2>
          <p className="text-[12px] max-w-sm mx-auto" style={{ color: 'rgb(107 100 92)' }}>
            Brackets will be drawn once the league is ready. Each round uses points from the corresponding World Cup stage.
          </p>
        </div>
        {isOwner ? (
          <div className="space-y-2">
            {memberCount < 2 && (
              <p className="text-[11px]" style={{ color: 'rgb(248 81 73)' }}>Need at least 2 members to draw.</p>
            )}
            <button
              onClick={handleDraw}
              disabled={isPending || memberCount < 2}
              className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-opacity disabled:opacity-40"
              style={{ background: 'rgb(217 119 87)', color: 'rgb(26 25 23)' }}
            >
              {isPending ? (
                <><span className="w-3.5 h-3.5 border-2 border-current/40 border-t-current rounded-full animate-spin" />Drawing…</>
              ) : '🎲 Draw Cup Bracket'}
            </button>
            {error && <p className="text-[11px]" style={{ color: 'rgb(248 81 73)' }}>{error}</p>}
          </div>
        ) : (
          <p className="text-[11px]" style={{ color: 'rgb(107 100 92)' }}>The league owner will trigger the draw.</p>
        )}
      </div>
    )
  }

  const { rounds, winnerId, status } = localBracket
  const activeRound = rounds.find((r) => r.status === 'active')

  return (
    <div className="space-y-6">
      {/* Owner controls */}
      {isOwner && status === 'active' && activeRound && (
        <div
          className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{ background: 'rgb(217 119 87 / 0.08)', border: '1px solid rgb(217 119 87 / 0.2)' }}
        >
          <div>
            <p className="text-[12px] font-semibold" style={{ color: 'rgb(240 235 227)' }}>Current: {activeRound.roundName}</p>
            <p className="text-[11px]" style={{ color: 'rgb(107 100 92)' }}>
              Advance after all {formatStage(activeRound.worldCupStage)} matches finish &amp; score
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={handleAdvance}
              disabled={isAdvancing}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-opacity disabled:opacity-40"
              style={{ background: 'rgb(217 119 87)', color: 'rgb(26 25 23)' }}
            >
              {isAdvancing ? <><span className="w-3 h-3 border-2 border-current/40 border-t-current rounded-full animate-spin" />Advancing…</> : '▶ Advance Round'}
            </button>
            {error && <p className="text-[11px]" style={{ color: 'rgb(248 81 73)' }}>{error}</p>}
          </div>
        </div>
      )}

      {/* Champion banner */}
      {status === 'completed' && winnerId && (
        <div
          className="rounded-xl p-5 text-center space-y-1"
          style={{ background: 'rgb(240 160 48 / 0.08)', border: '1px solid rgb(240 160 48 / 0.2)' }}
        >
          <p className="text-[11px] uppercase tracking-widest" style={{ color: 'rgb(240 160 48)' }}>Cup Champion</p>
          <p className="text-xl font-bold" style={{ color: 'rgb(240 235 227)' }}>
            🏆 {getDisplayName(winnerId)}
            {isMe(winnerId) && <span className="ml-2 text-[12px] font-normal" style={{ color: 'rgb(217 119 87)' }}>(you!)</span>}
          </p>
        </div>
      )}

      {/* Rounds */}
      {rounds.map((round) => (
        <section key={round.roundNumber}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[13px] font-semibold" style={{ color: 'rgb(240 235 227)' }}>{round.roundName}</span>
            <RoundBadge status={round.status} />
            <span className="text-[10px] ml-auto" style={{ color: 'rgb(107 100 92)' }}>
              {formatStage(round.worldCupStage)} points
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {round.matchups.map((matchup) => (
              <MatchupCard
                key={matchup._id}
                matchup={matchup}
                getDisplayName={getDisplayName}
                isMe={isMe}
                userMap={userMap}
                leagueSlug={leagueSlug}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 pt-3" style={{ borderTop: '1px solid rgb(255 255 255 / 0.06)' }}>
        {[
          ['rgb(63 185 80)', 'Winner'],
          ['rgb(107 100 92)', 'Points = WC stage pts'],
          ['rgb(107 100 92)', 'BYE = auto-advance'],
        ].map(([color, label]) => (
          <span key={label} className="text-[11px]" style={{ color }}>· {label}</span>
        ))}
      </div>
    </div>
  )
}

function MatchupCard({
  matchup, getDisplayName, isMe, userMap, leagueSlug,
}: {
  matchup: Matchup
  getDisplayName: (id: string | null, fallback?: string | null) => string
  isMe: (id: string | null) => boolean
  userMap: Record<string, { name: string; avatar?: string }>
  leagueSlug: string
}) {
  const homeName = matchup.homeUserName ?? getDisplayName(matchup.homeUserId)
  const awayName = matchup.isBye ? 'BYE' : (matchup.awayUserName ?? getDisplayName(matchup.awayUserId))

  const homeWon = matchup.winnerId && String(matchup.winnerId) === String(matchup.homeUserId)
  const awayWon = matchup.winnerId && !matchup.isBye && String(matchup.winnerId) === String(matchup.awayUserId)
  const decided = !!matchup.winnerId

  function dragUser(userId: string | null, name: string) {
    if (!userId) return {}
    return {
      draggable: true as const,
      onDragStart: (e: React.DragEvent) => {
        e.stopPropagation()
        e.dataTransfer.setData(MENTION_DRAG_KEY, JSON.stringify({ type: 'user', id: userId, label: name, meta: {} }))
        e.dataTransfer.effectAllowed = 'copy'
      },
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation()
        window.location.href = `/leagues/${leagueSlug}/predictions?userId=${userId}`
      },
      title: `Click → predictions · Drag → AI chat`,
      style: { cursor: 'grab' } as React.CSSProperties,
    }
  }

  const rowBase = (won: boolean | string | undefined) => ({
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: '10px 12px',
    background: won ? 'rgb(63 185 80 / 0.08)' : 'transparent',
    borderLeft: won ? '2px solid rgb(63 185 80)' : '2px solid transparent',
  })

  return (
    <div className="overflow-hidden" style={{ background: 'rgb(36 34 32)', border: '1px solid rgb(255 255 255 / 0.07)', borderRadius: '12px' }}>
      <div style={{ ...rowBase(homeWon), opacity: matchup.isBye ? 0.4 : 1 }}>
        <div className="flex items-center gap-1.5 min-w-0 flex-1 group/player" {...dragUser(matchup.homeUserId, homeName)}>
          <PlayerAvatar name={homeName} />
          <span className="text-[12px] truncate group-hover/player:underline underline-offset-2" style={{ color: isMe(matchup.homeUserId) ? 'rgb(217 119 87)' : 'rgb(240 235 227)', fontWeight: isMe(matchup.homeUserId) ? 600 : 400 }}>
            {homeName}
          </span>
        </div>
        <span className="text-[12px] font-mono ml-2 shrink-0" style={{ color: homeWon ? 'rgb(63 185 80)' : decided ? 'rgb(58 55 51)' : 'rgb(160 152 144)' }}>
          {matchup.isBye ? '–' : matchup.homePoints}
        </span>
      </div>

      <div style={{ height: '1px', background: 'rgb(255 255 255 / 0.05)' }} />

      <div style={rowBase(awayWon)}>
        <div className="flex items-center gap-1.5 min-w-0 flex-1 group/player" {...(matchup.isBye ? {} : dragUser(matchup.awayUserId, awayName))}>
          {matchup.isBye ? (
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]" style={{ background: 'rgb(255 255 255 / 0.05)', color: 'rgb(107 100 92)' }}>–</span>
          ) : (
            <PlayerAvatar name={awayName} />
          )}
          <span className={`text-[12px] truncate ${!matchup.isBye ? 'group-hover/player:underline underline-offset-2' : ''}`} style={{ color: matchup.isBye ? 'rgb(58 55 51)' : isMe(matchup.awayUserId) ? 'rgb(217 119 87)' : 'rgb(240 235 227)', fontWeight: isMe(matchup.awayUserId) ? 600 : 400 }}>
            {awayName}
          </span>
        </div>
        <span className="text-[12px] font-mono ml-2 shrink-0" style={{ color: awayWon ? 'rgb(63 185 80)' : decided ? 'rgb(58 55 51)' : 'rgb(160 152 144)' }}>
          {matchup.isBye ? '–' : matchup.awayPoints}
        </span>
      </div>
    </div>
  )
}

function PlayerAvatar({ name }: { name: string }) {
  return (
    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
      style={{ background: 'rgb(217 119 87 / 0.12)', color: 'rgb(217 119 87)' }}>
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

function RoundBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    active:    { label: 'Active',   bg: 'rgb(63 185 80 / 0.12)', color: 'rgb(63 185 80)' },
    pending:   { label: 'Upcoming', bg: 'rgb(255 255 255 / 0.06)', color: 'rgb(107 100 92)' },
    completed: { label: 'Done',     bg: 'rgb(255 255 255 / 0.06)', color: 'rgb(107 100 92)' },
  }
  const s = map[status] ?? map.pending
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function formatStage(stage: string): string {
  const map: Record<string, string> = {
    round_of_32: 'Round of 32', round_of_16: 'Round of 16',
    quarter_final: 'Quarter Finals', semi_final: 'Semi Finals',
    final: 'Final', group: 'Group Stage',
  }
  return map[stage] ?? stage
}
