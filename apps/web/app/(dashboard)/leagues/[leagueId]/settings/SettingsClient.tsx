'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

interface ScoringConfig {
  groupStage: { exactScore: number; correctResult: number }
  knockoutStage: { exactScore: number; correctResult: number; correctTeamAdvancing: number }
  bonuses: {
    tournamentWinner: { enabled: boolean; points: number }
    topScorer: { enabled: boolean; points: number }
    topAssist: { enabled: boolean; points: number }
    custom: { _id: string; label: string; description: string; points: number }[]
  }
}

interface Member {
  membershipId: string
  userId: string
  name: string
  avatar: string
  email: string
  role: string
  totalPoints: number
  rank: number
}

interface Props {
  leagueId: string
  leagueSlug: string
  scoringConfig: ScoringConfig
  members: Member[]
  currentUserId: string
  baseUrl: string
}

export function SettingsClient({ leagueId, leagueSlug, scoringConfig: initial, members: initialMembers, currentUserId, baseUrl }: Props) {
  const [config, setConfig] = useState<ScoringConfig>(initial)
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPendingSave, startSave] = useTransition()
  const [isPendingInvite, startInvite] = useTransition()

  function setGroupField(field: keyof ScoringConfig['groupStage'], value: number) {
    setConfig((c) => ({ ...c, groupStage: { ...c.groupStage, [field]: value } }))
  }

  function setKnockoutField(field: keyof ScoringConfig['knockoutStage'], value: number) {
    setConfig((c) => ({ ...c, knockoutStage: { ...c.knockoutStage, [field]: value } }))
  }

  function setBonusField(key: 'tournamentWinner' | 'topScorer' | 'topAssist', field: 'enabled' | 'points', value: boolean | number) {
    setConfig((c) => ({
      ...c,
      bonuses: { ...c.bonuses, [key]: { ...c.bonuses[key], [field]: value } },
    }))
  }

  function handleSaveConfig() {
    startSave(async () => {
      try {
        const res = await fetch(`/api/leagues/${leagueId}/scoring-config`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(JSON.stringify(data.error))
        toast.success('Scoring config saved')
      } catch (err: any) {
        toast.error('Failed to save: ' + err.message)
      }
    })
  }

  function handleGenerateInvite() {
    startInvite(async () => {
      try {
        const res = await fetch(`/api/leagues/${leagueId}/invites`, { method: 'POST' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setInviteUrl(data.data.inviteUrl)
        toast.success('Invite link generated (expires in 7 days)')
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  async function handleCopy() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleKick(userId: string, name: string) {
    if (!confirm(`Remove ${name} from the league?`)) return
    try {
      const res = await fetch(`/api/leagues/${leagueId}/members?userId=${userId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMembers((m) => m.filter((x) => x.userId !== userId))
      toast.success(`${name} removed`)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-8">
      {/* Invite Link */}
      <section className="border rounded-lg p-5 space-y-3">
        <h2 className="font-semibold">Invite Members</h2>
        <p className="text-sm text-muted-foreground">Generate a 7-day invite link to share with friends.</p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleGenerateInvite}
            disabled={isPendingInvite}
            className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPendingInvite ? 'Generating…' : 'Generate Invite Link'}
          </button>
          {inviteUrl && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <input
                readOnly
                value={inviteUrl}
                className="flex-1 min-w-0 text-xs border rounded-md px-3 py-2 bg-muted truncate"
              />
              <button
                onClick={handleCopy}
                className="shrink-0 px-3 py-2 text-xs border rounded-md hover:bg-accent transition-colors"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Scoring Config */}
      <section className="border rounded-lg p-5 space-y-5">
        <h2 className="font-semibold">Scoring Configuration</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Group Stage</h3>
            <div className="grid grid-cols-2 gap-3">
              <ScoreField label="Exact score" value={config.groupStage.exactScore} onChange={(v) => setGroupField('exactScore', v)} />
              <ScoreField label="Correct result" value={config.groupStage.correctResult} onChange={(v) => setGroupField('correctResult', v)} />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Knockout Stage</h3>
            <div className="grid grid-cols-3 gap-3">
              <ScoreField label="Exact score" value={config.knockoutStage.exactScore} onChange={(v) => setKnockoutField('exactScore', v)} />
              <ScoreField label="Correct result" value={config.knockoutStage.correctResult} onChange={(v) => setKnockoutField('correctResult', v)} />
              <ScoreField label="Right team through" value={config.knockoutStage.correctTeamAdvancing} onChange={(v) => setKnockoutField('correctTeamAdvancing', v)} />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Bonus Predictions</h3>
            <div className="space-y-2">
              <BonusRow label="Tournament Winner" bonus={config.bonuses.tournamentWinner} onToggle={(v) => setBonusField('tournamentWinner', 'enabled', v)} onPoints={(v) => setBonusField('tournamentWinner', 'points', v)} />
              <BonusRow label="Top Scorer" bonus={config.bonuses.topScorer} onToggle={(v) => setBonusField('topScorer', 'enabled', v)} onPoints={(v) => setBonusField('topScorer', 'points', v)} />
              <BonusRow label="Top Assist" bonus={config.bonuses.topAssist} onToggle={(v) => setBonusField('topAssist', 'enabled', v)} onPoints={(v) => setBonusField('topAssist', 'points', v)} />
            </div>
          </div>
        </div>

        <button
          onClick={handleSaveConfig}
          disabled={isPendingSave}
          className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPendingSave ? 'Saving…' : 'Save Scoring Config'}
        </button>
      </section>

      {/* Member Management */}
      <section className="border rounded-lg p-5 space-y-3">
        <h2 className="font-semibold">Members ({members.length})</h2>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center gap-3 py-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium shrink-0">
                {m.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.name}</p>
                <p className="text-xs text-muted-foreground truncate">{m.email}</p>
              </div>
              <span className="text-xs text-muted-foreground">{m.totalPoints} pts</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${m.role === 'owner' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {m.role}
              </span>
              {m.role !== 'owner' && m.userId !== currentUserId && (
                <button
                  onClick={() => handleKick(m.userId, m.name)}
                  className="text-xs text-destructive hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function ScoreField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        type="number"
        min={0}
        max={20}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        className="w-full border rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  )
}

function BonusRow({
  label,
  bonus,
  onToggle,
  onPoints,
}: {
  label: string
  bonus: { enabled: boolean; points: number }
  onToggle: (v: boolean) => void
  onPoints: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={bonus.enabled}
        onChange={(e) => onToggle(e.target.checked)}
        className="rounded"
      />
      <span className="text-sm flex-1">{label}</span>
      <input
        type="number"
        min={0}
        max={100}
        value={bonus.points}
        disabled={!bonus.enabled}
        onChange={(e) => onPoints(parseInt(e.target.value, 10) || 0)}
        className="w-16 border rounded-md px-2 py-1 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40"
      />
      <span className="text-xs text-muted-foreground">pts</span>
    </div>
  )
}
