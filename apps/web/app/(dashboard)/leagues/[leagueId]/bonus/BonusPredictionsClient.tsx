'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { PlayerSelectionModal } from '@/components/players/PlayerSelectionModal'
import { TeamSelectionModal } from '@/components/teams/TeamSelectionModal'

// Bonus types that pick a player from the synced roster rather than free text
const PLAYER_PICKER_TYPES = new Set(['top_scorer', 'top_assist'])
const TEAM_PICKER_TYPES = new Set(['tournament_winner'])

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

  // Underlying stored value (player apiId for player pickers; mirrors the label otherwise)
  const [ids, setIds] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const [k, p] of predMap) init[k] = p.value
    return init
  })

  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  const [teamPickerFor, setTeamPickerFor] = useState<string | null>(null)
  const [isPending, start] = useTransition()

  function setValue(key: string, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }))
    setIds((prev) => ({ ...prev, [key]: v }))
    setSaved((prev) => ({ ...prev, [key]: false }))
  }

  async function handleSave(type: string, key: string, customBonusId?: string) {
    const valueLabel = values[key] ?? ''
    if (!valueLabel.trim()) {
      toast.error('Please make a selection')
      return
    }
    const value = (ids[key] ?? valueLabel).trim()

    start(async () => {
      try {
        const res = await fetch(`/api/leagues/${leagueId}/bonus-predictions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, customBonusId, value, valueLabel: valueLabel.trim() }),
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
        <p className="text-sm font-medium" style={{ color: 'rgb(var(--c-text-2))' }}>No bonuses configured</p>
        <p className="text-[12px]" style={{ color: 'rgb(var(--c-text-3))' }}>The league owner hasn&apos;t enabled bonus predictions yet.</p>
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
              background: 'rgb(var(--c-overlay-xs))',
              border: existing && !isFinished
                ? '1px solid rgb(217 119 87 / 0.25)'
                : '1px solid rgb(var(--c-border-subtle))',
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-[13px] font-semibold" style={{ color: 'rgb(var(--c-text-1))' }}>{item.label}</p>
                {item.description && (
                  <p className="text-[11px]" style={{ color: 'rgb(var(--c-text-3))' }}>{item.description}</p>
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
              {PLAYER_PICKER_TYPES.has(item.type) || TEAM_PICKER_TYPES.has(item.type) ? (
                <button
                  type="button"
                  onClick={() => {
                    if (TEAM_PICKER_TYPES.has(item.type)) {
                      setTeamPickerFor(item.key)
                    } else {
                      setPickerFor(item.key)
                    }
                  }}
                  disabled={isLocked || isFinished}
                  className="flex-1 text-sm text-left focus:outline-none transition-colors hover:brightness-110 disabled:cursor-not-allowed"
                  style={{
                    background: 'rgb(var(--c-overlay-md))',
                    border: '1px solid rgb(var(--c-border-subtle))',
                    borderRadius: '10px',
                    color: currentValue ? 'rgb(var(--c-text-1))' : 'rgb(var(--c-text-3))',
                    padding: '8px 12px',
                    opacity: (isLocked || isFinished) ? 0.5 : 1,
                  }}
                >
                  {currentValue || `Select ${item.label.toLowerCase()}…`}
                </button>
              ) : (
                <input
                  type="text"
                  value={currentValue}
                  onChange={(e) => setValue(item.key, e.target.value)}
                  disabled={isLocked || isFinished}
                  placeholder={`Enter ${item.label.toLowerCase()}…`}
                  className="flex-1 text-sm focus:outline-none"
                  style={{
                    background: 'rgb(var(--c-overlay-md))',
                    border: '1px solid rgb(var(--c-border-subtle))',
                    borderRadius: '10px',
                    color: 'rgb(var(--c-text-1))',
                    padding: '8px 12px',
                    opacity: (isLocked || isFinished) ? 0.5 : 1,
                  }}
                />
              )}
              {!isLocked && !isFinished && (
                <button
                  onClick={() => handleSave(item.type, item.key, item.customId)}
                  disabled={isPending || !currentValue.trim()}
                  className="shrink-0 text-[11px] px-3 py-2 rounded-lg font-semibold transition-all disabled:opacity-30"
                  style={isSaved
                    ? { background: 'rgb(63 185 80 / 0.15)', color: 'rgb(63 185 80)' }
                    : { background: 'rgb(217 119 87)', color: 'rgb(var(--c-bg))' }
                  }
                >
                  {isSaved ? '✓ Saved' : existing ? 'Update' : 'Save'}
                </button>
              )}
            </div>

            {isFinished && (
              <div className="flex items-center justify-between">
                <span className="text-[11px]" style={{ color: 'rgb(var(--c-text-3))' }}>
                  Your pick: <span style={{ color: 'rgb(var(--c-text-2))' }}>{existing!.valueLabel}</span>
                </span>
                <span
                  className="text-[12px] font-bold font-mono px-2 py-0.5 rounded-full"
                  style={existing!.pointsEarned! > 0
                    ? { background: 'rgb(63 185 80 / 0.15)', color: 'rgb(63 185 80)' }
                    : { background: 'rgb(var(--c-overlay-md))', color: 'rgb(var(--c-text-3))' }
                  }
                >
                  {existing!.pointsEarned! > 0 ? `+${existing!.pointsEarned} pts` : '0 pts'}
                </span>
              </div>
            )}

            {isLocked && !isFinished && existing && (
              <p className="text-[11px]" style={{ color: 'rgb(var(--c-text-3))' }}>
                Your pick: <span style={{ color: 'rgb(var(--c-text-2))' }}>{existing.valueLabel}</span>
              </p>
            )}
          </div>
        )
      })}

      {isLocked && (
        <p className="text-[11px] text-center pt-2" style={{ color: 'rgb(var(--c-text-3))' }}>
          🔒 Bonus predictions locked — tournament has started
        </p>
      )}

      {pickerFor && (
        <PlayerSelectionModal
          title={`Select ${bonusItems.find((b) => b.key === pickerFor)?.label ?? 'Player'}`}
          selectedPlayerId={ids[pickerFor]}
          onClose={() => setPickerFor(null)}
          onSelect={(player) => {
            const key = pickerFor
            setValues((prev) => ({ ...prev, [key]: player.name }))
            setIds((prev) => ({ ...prev, [key]: player.apiPlayerId ?? player.id }))
            setSaved((prev) => ({ ...prev, [key]: false }))
          }}
        />
      )}

      {teamPickerFor && (
        <TeamSelectionModal
          title={`Select ${bonusItems.find((b) => b.key === teamPickerFor)?.label ?? 'Team'}`}
          selectedTeamApiId={ids[teamPickerFor]}
          onClose={() => setTeamPickerFor(null)}
          onSelect={(team) => {
            const key = teamPickerFor
            setValues((prev) => ({ ...prev, [key]: team.name }))
            setIds((prev) => ({ ...prev, [key]: team.apiId }))
            setSaved((prev) => ({ ...prev, [key]: false }))
          }}
        />
      )}
    </div>
  )
}
