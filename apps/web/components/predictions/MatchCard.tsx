'use client'

import { useState, useTransition } from 'react'
import { TeamFlag } from '@/components/shared/TeamFlag'
import { LockCountdown } from './LockCountdown'
import { toast } from 'sonner'

interface TeamInfo {
  name: string
  shortName: string
  flag: string
}

interface MatchResult {
  homeScore: number
  awayScore: number
}

interface Prediction {
  homeScore: number
  awayScore: number
  pointsEarned?: number
  isLocked?: boolean
}

interface Props {
  matchId: string
  leagueId: string
  homeTeam: TeamInfo
  awayTeam: TeamInfo
  kickoffAt: string
  lockAt: string
  status: string
  result?: MatchResult
  prediction?: Prediction
  group?: string
}

export function MatchCard({
  matchId,
  leagueId,
  homeTeam,
  awayTeam,
  kickoffAt,
  lockAt,
  status,
  result,
  prediction,
  group,
}: Props) {
  const [homeScore, setHomeScore] = useState<string>(
    prediction?.homeScore != null ? String(prediction.homeScore) : ''
  )
  const [awayScore, setAwayScore] = useState<string>(
    prediction?.awayScore != null ? String(prediction.awayScore) : ''
  )
  const [saved, setSaved] = useState(false)
  const [isLocked, setIsLocked] = useState(status === 'locked' || status === 'live' || status === 'finished')
  const [isPending, startTransition] = useTransition()

  const kickoffDate = new Date(kickoffAt)
  const isFinished = status === 'finished'

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
        toast.success('Prediction saved')
        setTimeout(() => setSaved(false), 2000)
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  return (
    <div className={`rounded-lg border bg-card p-4 flex flex-col gap-3 ${isFinished ? 'opacity-80' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{group ? `Group ${group}` : ''}</span>
        <span>
          {kickoffDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          {' · '}
          {kickoffDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </span>
        {!isLocked && <LockCountdown lockAt={lockAt} onLocked={() => setIsLocked(true)} />}
        {isLocked && !isFinished && <span className="text-xs text-orange-500 font-medium">🔒 Locked</span>}
        {isFinished && <span className="text-xs text-muted-foreground">FT</span>}
      </div>

      {/* Teams + score inputs */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex justify-end">
          <TeamFlag name={homeTeam.name} shortName={homeTeam.shortName} flag={homeTeam.flag} size="sm" />
        </div>

        {/* Score section */}
        <div className="flex items-center gap-2">
          {isFinished && result ? (
            // Show actual result
            <div className="flex items-center gap-2 font-bold text-lg">
              <span>{result.homeScore}</span>
              <span className="text-muted-foreground">-</span>
              <span>{result.awayScore}</span>
            </div>
          ) : (
            // Show prediction inputs
            <>
              <input
                type="number"
                min={0}
                max={30}
                value={homeScore}
                onChange={(e) => { setHomeScore(e.target.value); setSaved(false) }}
                disabled={isLocked}
                placeholder="0"
                className="w-12 h-10 text-center text-lg font-bold border rounded-md bg-background disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-muted-foreground font-medium">-</span>
              <input
                type="number"
                min={0}
                max={30}
                value={awayScore}
                onChange={(e) => { setAwayScore(e.target.value); setSaved(false) }}
                disabled={isLocked}
                placeholder="0"
                className="w-12 h-10 text-center text-lg font-bold border rounded-md bg-background disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </>
          )}
        </div>

        <div className="flex-1">
          <TeamFlag name={awayTeam.name} shortName={awayTeam.shortName} flag={awayTeam.flag} size="sm" />
        </div>
      </div>

      {/* Prediction row */}
      {!isLocked && (
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={isPending || homeScore === '' || awayScore === ''}
            className="px-4 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Saving…' : saved ? '✓ Saved' : prediction ? 'Update' : 'Predict'}
          </button>
        </div>
      )}

      {/* Points earned (after match) */}
      {isFinished && prediction && prediction.pointsEarned != null && (
        <div className="text-center text-sm font-semibold">
          {prediction.pointsEarned > 0 ? (
            <span className="text-green-600">+{prediction.pointsEarned} pts</span>
          ) : (
            <span className="text-muted-foreground">0 pts</span>
          )}
          {prediction.homeScore != null && (
            <span className="ml-2 text-xs text-muted-foreground">
              (You: {prediction.homeScore}–{prediction.awayScore})
            </span>
          )}
        </div>
      )}

      {/* Prediction preview (locked but not finished) */}
      {isLocked && !isFinished && prediction?.homeScore != null && (
        <div className="text-center text-xs text-muted-foreground">
          Your pick: {prediction.homeScore}–{prediction.awayScore}
        </div>
      )}
    </div>
  )
}
