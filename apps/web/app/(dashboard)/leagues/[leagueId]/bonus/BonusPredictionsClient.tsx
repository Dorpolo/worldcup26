'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

interface BonusConfig {
  tournamentWinner: { enabled: boolean; points: number }
  topScorer: { enabled: boolean; points: number }
  topAssist: { enabled: boolean; points: number }
  custom: { _id: string; label: string; description: string; points: number }[]
}

interface BonusPrediction {
  type: string
  customBonusId?: string
  value: string
  valueLabel: string
  pointsEarned?: number
}

interface Props {
  leagueId: string
  config: BonusConfig
  existingPredictions: BonusPrediction[]
  isLocked: boolean
}

export function BonusPredictionsClient({ leagueId, config, existingPredictions, isLocked }: Props) {
  const predMap = new Map(
    existingPredictions.map((p) => [p.customBonusId ? `custom_${p.customBonusId}` : p.type, p])
  )

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const [k, p] of predMap) init[k] = p.valueLabel
    return init
  })

  const [isPending, start] = useTransition()

  function setValue(key: string, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }))
  }

  async function handleSave(type: string, customBonusId?: string) {
    const key = customBonusId ? `custom_${customBonusId}` : type
    const valueLabel = values[key] ?? ''
    if (!valueLabel.trim()) {
      toast.error('Please enter a value')
      return
    }

    start(async () => {
      try {
        const res = await fetch(`/api/leagues/${leagueId}/bonus-predictions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            customBonusId,
            value: valueLabel.trim(),
            valueLabel: valueLabel.trim(),
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        toast.success('Saved!')
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  const bonusItems: { key: string; type: string; label: string; points: number; customId?: string }[] = []

  if (config.tournamentWinner.enabled) {
    bonusItems.push({ key: 'tournament_winner', type: 'tournament_winner', label: 'Tournament Winner', points: config.tournamentWinner.points })
  }
  if (config.topScorer.enabled) {
    bonusItems.push({ key: 'top_scorer', type: 'top_scorer', label: 'Top Scorer', points: config.topScorer.points })
  }
  if (config.topAssist.enabled) {
    bonusItems.push({ key: 'top_assist', type: 'top_assist', label: 'Top Assist Provider', points: config.topAssist.points })
  }
  for (const c of config.custom) {
    bonusItems.push({ key: `custom_${c._id}`, type: 'custom', label: c.label, points: c.points, customId: c._id })
  }

  if (bonusItems.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-3xl mb-3">🎁</p>
        <p>No bonus predictions configured for this league.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {bonusItems.map((item) => {
        const existing = predMap.get(item.key)
        const currentValue = values[item.key] ?? ''
        const isFinished = existing?.pointsEarned != null

        return (
          <div key={item.key} className="border rounded-lg p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium">{item.label}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{item.points} pts if correct</p>
              </div>
              {isFinished && (
                <span className={`text-sm font-semibold ${existing!.pointsEarned! > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {existing!.pointsEarned! > 0 ? `+${existing!.pointsEarned} pts` : '0 pts'}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={currentValue}
                onChange={(e) => setValue(item.key, e.target.value)}
                disabled={isLocked || isFinished}
                placeholder={`Enter ${item.label.toLowerCase()}…`}
                className="flex-1 border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40 disabled:cursor-not-allowed"
              />
              {!isLocked && !isFinished && (
                <button
                  onClick={() => handleSave(item.type, item.customId)}
                  disabled={isPending || !currentValue.trim()}
                  className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shrink-0"
                >
                  {existing ? 'Update' : 'Save'}
                </button>
              )}
            </div>

            {isLocked && existing && (
              <p className="text-xs text-muted-foreground">Your pick: <strong>{existing.valueLabel}</strong></p>
            )}
          </div>
        )
      })}

      {isLocked && (
        <p className="text-xs text-center text-muted-foreground">
          🔒 Bonus predictions are locked — the tournament has started.
        </p>
      )}
    </div>
  )
}
