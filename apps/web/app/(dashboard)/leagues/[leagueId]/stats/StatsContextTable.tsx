'use client'

import { useState } from 'react'
import { ContextCard } from '@/components/shared/ContextCard'
import { MatchDistributionModal } from '@/components/predictions/MatchDistributionModal'

interface MemberStat {
  userId: string
  name: string
  avatar?: string
  rank: number
  isMe: boolean
  totalPoints: number
  predicted: number
  exactScores: number
  correctResults: number
  missed: number
  accuracy: number
  pointsPerMatch: number
  bestStreak: number
}

interface MatchChip {
  matchId: string
  label: string
}

interface Props {
  members: MemberStat[]
  matches: MatchChip[]
  leagueSlug: string
  leagueMongoId: string
}

export function StatsContextTable({ members, matches, leagueSlug, leagueMongoId }: Props) {
  const [distributionMatchId, setDistributionMatchId] = useState<string | null>(null)
  const [distributionLabel, setDistributionLabel] = useState('')

  return (
    <>
      {distributionMatchId && (
        <MatchDistributionModal
          matchId={distributionMatchId}
          leagueSlug={leagueSlug}
          leagueMongoId={leagueMongoId}
          onClose={() => setDistributionMatchId(null)}
        />
      )}

      {/* Member stats table */}
      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgb(255 255 255 / 0.07)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid rgb(255 255 255 / 0.06)' }}>
              {['#', 'Member', 'Pts', 'Exact', 'Result', 'Accuracy', 'Pts/match', 'Streak'].map((h, i) => (
                <th
                  key={h}
                  className={i === 0 || i === 1 ? 'text-left' : 'text-right'}
                  style={{ padding: '10px 14px', color: 'rgb(107 100 92)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', background: 'rgb(255 255 255 / 0.02)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <ContextCard
                key={m.userId}
                mention={{ type: 'user', id: m.userId, label: m.name, meta: { rank: m.rank, points: m.totalPoints, accuracy: m.accuracy } }}
                href={`/leagues/${leagueSlug}/predictions?userId=${m.userId}`}
                className="contents"
              >
                <tr
                  className="hover:brightness-110 transition-all cursor-pointer"
                  style={{ borderBottom: '1px solid rgb(255 255 255 / 0.04)', background: m.isMe ? 'rgb(217 119 87 / 0.04)' : 'transparent' }}
                  draggable
                  onDragStart={(e) => {
                    const { MENTION_DRAG_KEY } = require('@/lib/mention-types')
                    e.dataTransfer.setData(MENTION_DRAG_KEY, JSON.stringify({ type: 'user', id: m.userId, label: m.name, meta: { rank: m.rank, points: m.totalPoints, accuracy: m.accuracy } }))
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  title={`Drag to AI chat to ask about ${m.name} · Click to view predictions`}
                  onClick={() => window.location.href = `/leagues/${leagueSlug}/predictions?userId=${m.userId}`}
                >
                  <td style={{ padding: '10px 14px', color: 'rgb(107 100 92)', fontSize: '12px' }}>{m.rank}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden"
                        style={{ background: 'rgb(217 119 87 / 0.12)', color: 'rgb(217 119 87)' }}>
                        {m.avatar ? <img src={m.avatar} alt="" className="w-full h-full object-cover" /> : m.name?.[0]?.toUpperCase()}
                      </div>
                      <span style={{ fontSize: '12px', color: 'rgb(240 235 227)', fontWeight: m.isMe ? 600 : 400 }}>
                        {m.name}
                        {m.isMe && <span style={{ color: 'rgb(217 119 87)', fontSize: '10px', marginLeft: '4px' }}>you</span>}
                      </span>
                    </div>
                  </td>
                  <td className="text-right" style={{ padding: '10px 14px', fontWeight: 700, fontSize: '12px', color: 'rgb(240 235 227)' }}>{m.totalPoints}</td>
                  <td className="text-right" style={{ padding: '10px 14px', fontSize: '12px', color: 'rgb(63 185 80)', fontWeight: 600 }}>{m.exactScores}</td>
                  <td className="text-right" style={{ padding: '10px 14px', fontSize: '12px', color: 'rgb(99 155 255)', fontWeight: 600 }}>{m.correctResults}</td>
                  <td className="text-right" style={{ padding: '10px 14px', fontSize: '12px', color: m.accuracy >= 50 ? 'rgb(63 185 80)' : 'rgb(107 100 92)', fontWeight: 600 }}>
                    {m.accuracy}%
                  </td>
                  <td className="text-right" style={{ padding: '10px 14px', fontSize: '12px', color: 'rgb(107 100 92)' }}>{m.pointsPerMatch}</td>
                  <td className="text-right" style={{ padding: '10px 14px', fontSize: '12px' }}>
                    {m.bestStreak > 0
                      ? <span style={{ color: 'rgb(240 160 48)' }}>🔥 {m.bestStreak}</span>
                      : <span style={{ color: 'rgb(58 55 51)' }}>–</span>}
                  </td>
                </tr>
              </ContextCard>
            ))}
          </tbody>
        </table>
      </div>

      {/* Match breakdown chips */}
      {matches.length > 0 && (
        <section>
          <p className="text-[13px] font-semibold mb-3" style={{ color: 'rgb(240 235 227)' }}>Match Breakdown</p>
          <div className="flex flex-wrap gap-2">
            {matches.map((m) => (
              <div
                key={m.matchId}
                draggable
                onDragStart={(e) => {
                  const { MENTION_DRAG_KEY } = require('@/lib/mention-types')
                  e.dataTransfer.setData(MENTION_DRAG_KEY, JSON.stringify({ type: 'match', id: m.matchId, label: m.label, meta: { status: 'finished' } }))
                  e.dataTransfer.effectAllowed = 'copy'
                }}
                onClick={() => { setDistributionMatchId(m.matchId); setDistributionLabel(m.label) }}
                title={`Click to see predictions · Drag to AI chat`}
                className="cursor-pointer group relative"
              >
                <span
                  className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full transition-all hover:brightness-125"
                  style={{ background: 'rgb(255 255 255 / 0.05)', border: '1px solid rgb(255 255 255 / 0.1)', color: 'rgb(160 152 144)' }}
                >
                  <span className="opacity-50 text-[9px]">⚽</span>
                  {m.label}
                  <span className="opacity-0 group-hover:opacity-40 text-[9px] transition-opacity">⠿</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
