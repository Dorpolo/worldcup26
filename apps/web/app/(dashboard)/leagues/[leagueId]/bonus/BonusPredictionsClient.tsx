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

  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [isPending, start] = useTransition()

  function setValue(key: string, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }))
    setSaved((prev) => ({ ...prev, [key]: false }))
  }

  async function handleSave(type: string, key: string, customBonusId?: string) {
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
          body: JSON.stringify({ type, customBonusId, value: valueLabel.trim(), valueLabel: valueLabel.trim() }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setSaved((prev) => ({ ...prev, [key]: true }))
        setTimeout(() => setSaved((prev) => ({ ...prev, [key]: false })), 2500)
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  const bonusItems: { key: string; type: string; label: string; points: number; customId?: string; description?: string }[] = []

  if (config.tournamentWinner.enabled) {
    bonusItems.push({ key: 'tournament_winner', type: 'tournament_winner', label: 'Tournament Winner', points: config.tournamentWinner.points, description: 'Which team wins the World Cup?' })
  }
  if (config.topScorer.enabled) {
    bonusItems.push({ key: 'top_scorer', type: 'top_scorer', label: 'Top Scorer', points: config.topScorer.points, description: 'Who scores the most goals?' })
  }
  if (config.topAssist.enabled) {
    bonusItems.push({ key: 'top_assist', type: 'top_assist', label: 'Top Assist Provider', points: config.topAssist.points, description: 'Who provides the most assists?' })
  }
  for (const c of config.custom) {
    bonusItems.push({ key: `custom_${c._id}`, type: 'custom', label: c.label, points: c.points, customId: c._id, description: c.description })
  }

  if (bonusItems.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-4xl">🎁</p>
        <p className="text-sm font-medium" style={{ color: 'rgb(160 152 144)' }}>No bonuses configured</p>
        <p className="text-[12px]" style={{ color: 'rgb(107 100 92)' }}>The league owner hasn&apos;t enabled bonus predictions yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {bonusItems.map((item) => {
        const existing = predMap.get(item.key)
        const currentValue = values[item.key] ?? ''
        const isFinished = existing?.pointsEarned != null
        const isSaved = saved[item.key]

        return (
          <div
            key={item.key}
            className="rounded-xl p-4 space-y-3"
            style={{
              background: 'rgb(255 255 255 / 0.03)',
              border: existing && !isFinished
                ? '1px solid rgb(217 119 87 / 0.25)'
                : '1px solid rgb(255 255 255 / 0.07)',
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-[13px] font-semibold" style={{ color: 'rgb(240 235 227)' }}>{item.label}</p>
                {item.description && (
                  <p className="text-[11px]" style={{ color: 'rgb(107 100 92)' }}>{item.description}</p>
                )}
              </div>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                style={{ background: 'rgb(217 119 87 / 0.12)', color: 'rgb(217 119 87)' }}
              >
                {item.points} pts
              </span>
            </div>

            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={currentValue}
                onChange={(e) => setValue(item.key, e.target.value)}
                disabled={isLocked || isFinished}
                placeholder={`Enter ${item.label.toLowerCase()}…`}
                className="flex-1 text-sm focus:outline-none"
                style={{
                  background: 'rgb(255 255 255 / 0.05)',
                  border: '1px solid rgb(255 255 255 / 0.09)',
                  borderRadius: '10px',
                  color: 'rgb(240 235 227)',
                  padding: '8px 12px',
                  opacity: (isLocked || isFinished) ? 0.5 : 1,
                }}
              />
              {!isLocked && !isFinished && (
                <button
                  onClick={() => handleSave(item.type, item.key, item.customId)}
                  disabled={isPending || !currentValue.trim()}
                  className="shrink-0 text-[11px] px-3 py-2 rounded-lg font-semibold transition-all disabled:opacity-30"
                  style={isSaved
                    ? { background: 'rgb(63 185 80 / 0.15)', color: 'rgb(63 185 80)' }
                    : { background: 'rgb(217 119 87)', color: 'rgb(26 25 23)' }
                  }
                >
                  {isSaved ? '✓ Saved' : existing ? 'Update' : 'Save'}
                </button>
              )}
            </div>

            {isFinished && (
              <div className="flex items-center justify-between">
                <span className="text-[11px]" style={{ color: 'rgb(107 100 92)' }}>
                  Your pick: <span style={{ color: 'rgb(160 152 144)' }}>{existing!.valueLabel}</span>
                </span>
                <span
                  className="text-[12px] font-bold font-mono px-2 py-0.5 rounded-full"
                  style={existing!.pointsEarned! > 0
                    ? { background: 'rgb(63 185 80 / 0.15)', color: 'rgb(63 185 80)' }
                    : { background: 'rgb(255 255 255 / 0.05)', color: 'rgb(107 100 92)' }
                  }
                >
                  {existing!.pointsEarned! > 0 ? `+${existing!.pointsEarned} pts` : '0 pts'}
                </span>
              </div>
            )}

            {isLocked && !isFinished && existing && (
              <p className="text-[11px]" style={{ color: 'rgb(107 100 92)' }}>
                Your pick: <span style={{ color: 'rgb(160 152 144)' }}>{existing.valueLabel}</span>
              </p>
            )}
          </div>
        )
      })}

      {isLocked && (
        <p className="text-[11px] text-center pt-2" style={{ color: 'rgb(107 100 92)' }}>
          🔒 Bonus predictions locked — tournament has started
        </p>
      )}
    </div>
  )
}
