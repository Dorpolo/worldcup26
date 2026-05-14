'use client'

import { ContextCard } from '@/components/shared/ContextCard'
import { MatchDistributionModal } from '@/components/predictions/MatchDistributionModal'
import { useState } from 'react'
import Link from 'next/link'

interface MemberEntry {
  userId: string
  name: string
  avatar?: string
  totalPoints: number
  rank: number
  isMe: boolean
}

interface MatchEntry {
  matchId: string
  homeTeam: string
  awayTeam: string
  kickoffAt: string
  status: string
}

interface Props {
  members: MemberEntry[]
  upcomingMatches: MatchEntry[]
  leagueSlug: string
  leagueMongoId: string
  base: string
}

export function OverviewContextCards({ members, upcomingMatches, leagueSlug, leagueMongoId, base }: Props) {
  const [distributionMatch, setDistributionMatch] = useState<MatchEntry | null>(null)

  return (
    <>
      {distributionMatch && (
        <MatchDistributionModal
          matchId={distributionMatch.matchId}
          leagueSlug={leagueSlug}
          leagueMongoId={leagueMongoId}
          onClose={() => setDistributionMatch(null)}
        />
      )}

      {/* Mini standings */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgb(255 255 255 / 0.07)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgb(255 255 255 / 0.07)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgb(107 100 92)' }}>Standings</p>
          <Link href={`${base}/leaderboard`} className="text-[11px]" style={{ color: 'rgb(217 119 87)' }}>View all →</Link>
        </div>

        {members.map((m, i) => (
          <ContextCard
            key={m.userId}
            mention={{ type: 'user', id: m.userId, label: m.name, meta: { rank: m.rank, points: m.totalPoints } }}
            href={`${base}/predictions?userId=${m.userId}`}
            style={{ borderBottom: i < members.length - 1 ? '1px solid rgb(255 255 255 / 0.04)' : undefined }}
          >
            <div
              className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.02]"
              style={{ background: m.isMe ? 'rgb(217 119 87 / 0.06)' : undefined }}
            >
              <span className="text-[11px] font-bold w-5 text-center shrink-0"
                style={{ color: i === 0 ? '#f5c842' : i === 1 ? '#a0a0a0' : i === 2 ? '#c87533' : 'rgb(107 100 92)' }}>
                {i < 3 ? ['🥇','🥈','🥉'][i] : `${i + 1}`}
              </span>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden"
                style={{ background: 'rgb(217 119 87 / 0.15)', color: 'rgb(217 119 87)' }}>
                {m.avatar ? <img src={m.avatar} alt="" className="w-full h-full object-cover" /> : m.name?.charAt(0)}
              </div>
              <p className="flex-1 text-[12px] font-medium truncate" style={{ color: m.isMe ? 'rgb(240 235 227)' : 'rgb(160 152 144)' }}>
                {m.name}
                {m.isMe && <span style={{ color: 'rgb(217 119 87)', fontSize: '10px' }}> you</span>}
              </p>
              <p className="text-[12px] font-semibold font-mono shrink-0" style={{ color: 'rgb(240 235 227)' }}>{m.totalPoints}</p>
            </div>
          </ContextCard>
        ))}
      </div>

      {/* Upcoming matches */}
      {upcomingMatches.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgb(255 255 255 / 0.07)' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgb(255 255 255 / 0.07)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgb(107 100 92)' }}>Coming Up</p>
            <Link href={`${base}/predictions`} className="text-[11px]" style={{ color: 'rgb(217 119 87)' }}>Predict →</Link>
          </div>

          {upcomingMatches.map((match, i) => {
            const kickoff = new Date(match.kickoffAt)
            const isLocked = match.status === 'locked' || match.status === 'finished'
            return (
              <ContextCard
                key={match.matchId}
                mention={{ type: 'match', id: match.matchId, label: `${match.homeTeam} vs ${match.awayTeam}`, meta: { home: match.homeTeam, away: match.awayTeam, status: match.status } }}
                onClick={isLocked ? () => setDistributionMatch(match) : undefined}
                href={isLocked ? undefined : `${base}/predictions`}
                style={{ borderBottom: i < upcomingMatches.length - 1 ? '1px solid rgb(255 255 255 / 0.04)' : undefined }}
              >
                <div className="px-4 py-3 flex items-center gap-3 transition-colors hover:bg-white/[0.02]">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium truncate" style={{ color: 'rgb(240 235 227)' }}>
                      {match.homeTeam} vs {match.awayTeam}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'rgb(107 100 92)' }}>
                      {kickoff.toLocaleDateString()} · {kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {match.status === 'locked' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgb(248 81 73 / 0.15)', color: 'rgb(248 81 73)' }}>Locked</span>
                  )}
                  {match.status === 'finished' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: 'rgb(255 255 255 / 0.05)', color: 'rgb(107 100 92)' }}>FT</span>
                  )}
                </div>
              </ContextCard>
            )
          })}
        </div>
      )}
    </>
  )
}
