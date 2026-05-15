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
  const [isSyncing, startSync] = useTransition()

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

  function handleSyncFixtures() {
    startSync(async () => {
      try {
        const res = await fetch('/api/admin/sync-fixtures', { method: 'POST' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Sync failed')
        toast.success(`Fixtures synced — ${data.synced ?? 0} matches updated`)
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  const cardStyle = {
    background: 'rgb(var(--c-surface))',
    border: '1px solid rgb(var(--c-border-subtle))',
    borderRadius: '16px',
    padding: '20px',
  }

  const labelStyle = { color: 'rgb(var(--c-text-3))', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }
  const inputStyle = {
    background: 'rgb(var(--c-overlay-md))',
    border: '1px solid rgb(var(--c-border-subtle))',
    borderRadius: '10px',
    color: 'rgb(var(--c-text-1))',
    padding: '8px 12px',
    fontSize: '13px',
    outline: 'none',
    width: '100%',
  }
  const primaryBtn = {
    background: 'rgb(217 119 87)',
    color: 'rgb(var(--c-bg))',
    borderRadius: '10px',
    padding: '9px 18px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    opacity: 1,
  }
  const ghostBtn = {
    background: 'rgb(var(--c-border-soft))',
    color: 'rgb(var(--c-text-2))',
    borderRadius: '10px',
    padding: '9px 18px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid rgb(var(--c-border-normal))',
  }

  return (
    <div className="space-y-5">

      {/* Invite Members */}
      <section style={cardStyle}>
        <div className="space-y-3">
          <div>
            <p className="text-[13px] font-semibold mb-0.5" style={{ color: 'rgb(var(--c-text-1))' }}>Invite Members</p>
            <p className="text-[12px]" style={{ color: 'rgb(var(--c-text-3))' }}>Share a 7-day invite link with friends.</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <button onClick={handleGenerateInvite} disabled={isPendingInvite} style={{ ...primaryBtn, opacity: isPendingInvite ? 0.5 : 1 }}>
              {isPendingInvite ? 'Generating…' : 'Generate Invite Link'}
            </button>
            {inviteUrl && (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <input readOnly value={inviteUrl} style={{ ...inputStyle, fontSize: '11px' }} className="flex-1 min-w-0 truncate" />
                <button onClick={handleCopy} style={ghostBtn}>
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Sync Fixtures */}
      <section style={cardStyle}>
        <div className="space-y-3">
          <div>
            <p className="text-[13px] font-semibold mb-0.5" style={{ color: 'rgb(var(--c-text-1))' }}>Fixture Sync</p>
            <p className="text-[12px]" style={{ color: 'rgb(var(--c-text-3))' }}>
              Pull the latest fixtures and results from API-Football. Safe to run multiple times.
            </p>
          </div>
          <button onClick={handleSyncFixtures} disabled={isSyncing} style={{ ...ghostBtn, opacity: isSyncing ? 0.5 : 1 }}>
            {isSyncing ? 'Syncing…' : '↻  Sync Fixtures'}
          </button>
        </div>
      </section>

      {/* Scoring Config */}
      <section style={cardStyle}>
        <div className="space-y-5">
          <p className="text-[13px] font-semibold" style={{ color: 'rgb(var(--c-text-1))' }}>Scoring Configuration</p>

          <div className="space-y-4">
            <div>
              <p className="mb-2.5" style={labelStyle}>Group Stage</p>
              <div className="grid grid-cols-2 gap-3">
                <ScoreField label="Exact score" value={config.groupStage.exactScore} onChange={(v) => setGroupField('exactScore', v)} />
                <ScoreField label="Correct result" value={config.groupStage.correctResult} onChange={(v) => setGroupField('correctResult', v)} />
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgb(var(--c-overlay-md))', paddingTop: '16px' }}>
              <p className="mb-2.5" style={labelStyle}>Knockout Stage</p>
              <div className="grid grid-cols-3 gap-3">
                <ScoreField label="Exact score" value={config.knockoutStage.exactScore} onChange={(v) => setKnockoutField('exactScore', v)} />
                <ScoreField label="Correct result" value={config.knockoutStage.correctResult} onChange={(v) => setKnockoutField('correctResult', v)} />
                <ScoreField label="Right team through" value={config.knockoutStage.correctTeamAdvancing} onChange={(v) => setKnockoutField('correctTeamAdvancing', v)} />
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgb(var(--c-overlay-md))', paddingTop: '16px' }}>
              <p className="mb-3" style={labelStyle}>Bonus Predictions</p>
              <div className="space-y-2.5">
                <BonusRow label="Tournament Winner" bonus={config.bonuses.tournamentWinner} onToggle={(v) => setBonusField('tournamentWinner', 'enabled', v)} onPoints={(v) => setBonusField('tournamentWinner', 'points', v)} />
                <BonusRow label="Top Scorer" bonus={config.bonuses.topScorer} onToggle={(v) => setBonusField('topScorer', 'enabled', v)} onPoints={(v) => setBonusField('topScorer', 'points', v)} />
                <BonusRow label="Top Assist" bonus={config.bonuses.topAssist} onToggle={(v) => setBonusField('topAssist', 'enabled', v)} onPoints={(v) => setBonusField('topAssist', 'points', v)} />
              </div>
            </div>
          </div>

          <button onClick={handleSaveConfig} disabled={isPendingSave} style={{ ...primaryBtn, opacity: isPendingSave ? 0.5 : 1 }}>
            {isPendingSave ? 'Saving…' : 'Save Scoring Config'}
          </button>
        </div>
      </section>

      {/* Member Management */}
      <section style={cardStyle}>
        <div className="space-y-3">
          <p className="text-[13px] font-semibold" style={{ color: 'rgb(var(--c-text-1))' }}>
            Members <span style={{ color: 'rgb(var(--c-text-3))', fontWeight: 400 }}>({members.length})</span>
          </p>
          <div className="space-y-1">
            {members.map((m) => (
              <div key={m.userId} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid rgb(var(--c-overlay-sm))' }}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                  style={{ background: 'rgb(217 119 87 / 0.12)', color: 'rgb(217 119 87)' }}
                >
                  {m.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium truncate" style={{ color: 'rgb(var(--c-text-1))' }}>{m.name}</p>
                  <p className="text-[11px] truncate" style={{ color: 'rgb(var(--c-text-3))' }}>{m.email}</p>
                </div>
                <span className="text-[11px] font-mono" style={{ color: 'rgb(var(--c-text-3))' }}>{m.totalPoints} pts</span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={m.role === 'owner'
                    ? { background: 'rgb(217 119 87 / 0.12)', color: 'rgb(217 119 87)' }
                    : { background: 'rgb(var(--c-overlay-md))', color: 'rgb(var(--c-text-3))' }
                  }
                >
                  {m.role}
                </span>
                {m.role !== 'owner' && m.userId !== currentUserId && (
                  <button
                    onClick={() => handleKick(m.userId, m.name)}
                    className="text-[11px] transition-colors hover:opacity-80"
                    style={{ color: 'rgb(248 81 73)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function ScoreField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px]" style={{ color: 'rgb(var(--c-text-3))' }}>{label}</label>
      <input
        type="number"
        min={0}
        max={20}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        style={{
          background: 'rgb(var(--c-overlay-md))',
          border: '1px solid rgb(var(--c-border-subtle))',
          borderRadius: '10px',
          color: 'rgb(var(--c-text-1))',
          padding: '7px 12px',
          fontSize: '13px',
          outline: 'none',
          width: '100%',
        }}
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
      <button
        onClick={() => onToggle(!bonus.enabled)}
        className="w-8 h-4 rounded-full flex-shrink-0 relative transition-all"
        style={{
          background: bonus.enabled ? 'rgb(217 119 87)' : 'rgb(var(--c-border-normal))',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <span
          className="absolute top-0.5 w-3 h-3 rounded-full transition-all"
          style={{
            background: 'rgb(255 255 255)',
            left: bonus.enabled ? 'calc(100% - 14px)' : '2px',
          }}
        />
      </button>
      <span className="text-[12px] flex-1" style={{ color: bonus.enabled ? 'rgb(var(--c-text-1))' : 'rgb(var(--c-text-3))' }}>{label}</span>
      <input
        type="number"
        min={0}
        max={100}
        value={bonus.points}
        disabled={!bonus.enabled}
        onChange={(e) => onPoints(parseInt(e.target.value, 10) || 0)}
        style={{
          background: 'rgb(var(--c-overlay-md))',
          border: '1px solid rgb(var(--c-border-subtle))',
          borderRadius: '8px',
          color: bonus.enabled ? 'rgb(var(--c-text-1))' : 'rgb(var(--c-text-3))',
          padding: '5px 8px',
          fontSize: '12px',
          outline: 'none',
          width: '52px',
          opacity: bonus.enabled ? 1 : 0.4,
          textAlign: 'center',
        }}
      />
      <span className="text-[11px]" style={{ color: 'rgb(var(--c-text-3))' }}>pts</span>
    </div>
  )
}
