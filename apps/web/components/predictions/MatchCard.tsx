'use client'

import { useState, useTransition } from 'react'
import { useMatchCountdown } from '@/hooks/useMatchCountdown'
import { useLiveMatch } from '@/hooks/useLiveMatch'
import { toast } from 'sonner'

interface TeamInfo { name: string; shortName: string; flag?: string }
interface MatchResult { homeScore: number; awayScore: number }
interface Prediction { homeScore: number; awayScore: number; pointsEarned?: number; isLocked?: boolean }

interface Props {
  matchId: string
  leagueId: string
  homeTeam: TeamInfo | any
  awayTeam: TeamInfo | any
  kickoffAt: string
  lockAt: string
  status: string
  result?: MatchResult
  prediction?: Prediction
  group?: string
}

export function MatchCard({ matchId, leagueId, homeTeam, awayTeam, kickoffAt, lockAt, status, result, prediction, group }: Props) {
  const [homeScore, setHomeScore] = useState<string>(prediction?.homeScore != null ? String(prediction.homeScore) : '')
  const [awayScore, setAwayScore] = useState<string>(prediction?.awayScore != null ? String(prediction.awayScore) : '')
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const isFinished = status === 'finished'
  const countdown = useMatchCountdown(lockAt)
  const isLocked = status === 'locked' || status === 'live' || isFinished || countdown.locked

  const { liveScore, isLocked: wsLocked } = useLiveMatch(
    matchId,
    status === 'live' && result ? { homeScore: result.homeScore, awayScore: result.awayScore, status } : undefined
  )

  const effectiveLocked = isLocked || wsLocked
  const displayResult = liveScore ?? result
  const kickoffDate = new Date(kickoffAt)
  const isLive = status === 'live' || !!liveScore

  const homeName = typeof homeTeam === 'object' ? (homeTeam.shortName || homeTeam.name) : String(homeTeam)
  const awayName = typeof awayTeam === 'object' ? (awayTeam.shortName || awayTeam.name) : String(awayTeam)
  const homeFullName = typeof homeTeam === 'object' ? homeTeam.name : String(homeTeam)
  const awayFullName = typeof awayTeam === 'object' ? awayTeam.name : String(awayTeam)

  const hasPrediction = prediction?.homeScore != null

  function handleSubmit() {
    const h = parseInt(homeScore, 10)
    const a = parseInt(awayScore, 10)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      toast.error('Enter valid scores (0 or higher)')
      return
    }
    startTransition(async () => {
      try {
        const res = await fetch('/api/predictions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId, leagueId, homeScore: h, awayScore: a }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to save')
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  return (
    <div
      className="rounded-xl p-3.5 flex flex-col gap-3 transition-all duration-150"
      style={{
        background: isFinished ? 'rgb(255 255 255 / 0.02)' : 'rgb(255 255 255 / 0.04)',
        border: hasPrediction && !isFinished
          ? '1px solid rgb(217 119 87 / 0.25)'
          : '1px solid rgb(255 255 255 / 0.07)',
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: 'rgb(107 100 92)' }}>
          {group ? `Group ${group}` : kickoffDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
        </span>
        <span className="text-[10px]" style={{ color: 'rgb(107 100 92)' }}>
          {kickoffDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <StatusBadge locked={effectiveLocked} finished={isFinished} live={isLive} countdown={countdown} />
      </div>

      {/* Teams + score row */}
      <div className="flex items-center gap-2">
        {/* Home */}
        <div className="flex-1 flex flex-col items-end gap-0.5">
          <p className="text-[12px] font-semibold text-right leading-tight" style={{ color: 'rgb(240 235 227)' }}
            title={homeFullName}>{homeName}</p>
        </div>

        {/* Score / inputs */}
        <div className="flex items-center gap-1.5 shrink-0">
          {(isFinished || isLive) && displayResult ? (
            <div className="flex items-center gap-2 px-2">
              <span className="text-xl font-bold font-mono" style={{ color: isLive ? 'rgb(63 185 80)' : 'rgb(240 235 227)' }}>
                {displayResult.homeScore}
              </span>
              <span className="text-sm" style={{ color: 'rgb(58 55 51)' }}>—</span>
              <span className="text-xl font-bold font-mono" style={{ color: isLive ? 'rgb(63 185 80)' : 'rgb(240 235 227)' }}>
                {displayResult.awayScore}
              </span>
            </div>
          ) : (
            <>
              <ScoreInput value={homeScore} onChange={(v) => { setHomeScore(v); setSaved(false) }} disabled={effectiveLocked} />
              <span className="text-sm font-medium" style={{ color: 'rgb(58 55 51)' }}>—</span>
              <ScoreInput value={awayScore} onChange={(v) => { setAwayScore(v); setSaved(false) }} disabled={effectiveLocked} />
            </>
          )}
        </div>

        {/* Away */}
        <div className="flex-1 flex flex-col items-start gap-0.5">
          <p className="text-[12px] font-semibold leading-tight" style={{ color: 'rgb(240 235 227)' }}
            title={awayFullName}>{awayName}</p>
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between min-h-[24px]">
        {/* Your pick preview */}
        <div className="text-[11px]" style={{ color: 'rgb(107 100 92)' }}>
          {hasPrediction && (isFinished || effectiveLocked) && (
            <>Your pick: {prediction!.homeScore}–{prediction!.awayScore}</>
          )}
        </div>

        {/* Points or save button */}
        {isFinished && prediction?.pointsEarned != null ? (
          <span
            className="text-[12px] font-bold font-mono px-2 py-0.5 rounded-full"
            style={prediction.pointsEarned > 0
              ? { background: 'rgb(63 185 80 / 0.15)', color: 'rgb(63 185 80)' }
              : { background: 'rgb(255 255 255 / 0.05)', color: 'rgb(107 100 92)' }
            }
          >
            {prediction.pointsEarned > 0 ? `+${prediction.pointsEarned} pts` : '0 pts'}
          </span>
        ) : !effectiveLocked && !isFinished ? (
          <button
            onClick={handleSubmit}
            disabled={isPending || homeScore === '' || awayScore === ''}
            className="text-[11px] px-3 py-1 rounded-lg font-semibold transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
            style={saved
              ? { background: 'rgb(63 185 80 / 0.15)', color: 'rgb(63 185 80)' }
              : { background: 'rgb(217 119 87)', color: 'rgb(26 25 23)' }
            }
          >
            {isPending ? '…' : saved ? '✓ Saved' : hasPrediction ? 'Update' : 'Predict'}
          </button>
        ) : null}
      </div>
    </div>
  )
}

function ScoreInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  return (
    <input
      type="number"
      min={0}
      max={30}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder="—"
      className="w-10 h-10 text-center text-base font-bold font-mono rounded-lg focus:outline-none transition-all disabled:cursor-not-allowed"
      style={{
        background: disabled ? 'rgb(255 255 255 / 0.03)' : 'rgb(255 255 255 / 0.07)',
        border: '1px solid rgb(255 255 255 / 0.1)',
        color: disabled ? 'rgb(107 100 92)' : 'rgb(240 235 227)',
      }}
    />
  )
}

function StatusBadge({ locked, finished, live, countdown }: {
  locked: boolean; finished: boolean; live: boolean
  countdown: ReturnType<typeof useMatchCountdown>
}) {
  if (finished) return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgb(255 255 255 / 0.05)', color: 'rgb(107 100 92)' }}>FT</span>
  if (live) return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full animate-pulse" style={{ background: 'rgb(63 185 80 / 0.15)', color: 'rgb(63 185 80)' }}>● LIVE</span>
  if (locked) return <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgb(240 160 48 / 0.15)', color: 'rgb(240 160 48)' }}>Locked</span>
  if (countdown.urgency === 'critical') return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full animate-pulse" style={{ background: 'rgb(248 81 73 / 0.15)', color: 'rgb(248 81 73)' }}>🔒 {countdown.label}</span>
  if (countdown.urgency === 'warning') return <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgb(240 160 48 / 0.12)', color: 'rgb(240 160 48)' }}>🔒 {countdown.label}</span>
  return <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: 'rgb(107 100 92)' }}>🔒 {countdown.label}</span>
}
