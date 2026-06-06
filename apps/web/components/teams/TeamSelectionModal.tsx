'use client'

import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { TeamInfo } from '@worldcup26/types'
import { TeamFlag } from '@/components/shared/TeamFlag'

interface Props {
  onSelect: (team: TeamInfo) => void
  onClose: () => void
  selectedTeamApiId?: string
  title?: string
}

export function TeamSelectionModal({ onSelect, onClose, selectedTeamApiId, title }: Props) {
  const [teams, setTeams] = useState<TeamInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch('/api/teams')
        if (!res.ok) throw new Error(`Failed to fetch teams: ${res.status}`)
        const json = await res.json()
        setTeams(json.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch teams')
      } finally {
        setLoading(false)
      }
    }
    fetchTeams()
  }, [])

  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.shortName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="rounded-lg w-full max-w-md shadow-lg flex flex-col max-h-[80vh]"
        style={{ background: 'rgb(var(--c-bg))' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 shrink-0 border-b"
          style={{ borderColor: 'rgb(var(--c-border-subtle))' }}
        >
          <h3
            className="text-sm font-semibold"
            style={{ color: 'rgb(var(--c-text-1))' }}
          >
            {title || 'Select Team'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors hover:opacity-75"
            style={{ color: 'rgb(var(--c-text-3))' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 shrink-0 border-b" style={{ borderColor: 'rgb(var(--c-border-subtle))' }}>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-md border"
            style={{
              background: 'rgb(var(--c-bg-input))',
              borderColor: 'rgb(var(--c-border-subtle))',
            }}
          >
            <Search className="w-4 h-4" style={{ color: 'rgb(var(--c-text-3))' }} />
            <input
              type="text"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'rgb(var(--c-text-1))' }}
              autoFocus
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center p-8">
              <span style={{ color: 'rgb(var(--c-text-3))' }}>Loading teams...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center p-8">
              <span style={{ color: 'rgb(248 81 73)' }}>{error}</span>
            </div>
          )}

          {!loading && !error && filteredTeams.length === 0 && (
            <div className="flex items-center justify-center p-8">
              <span style={{ color: 'rgb(var(--c-text-3))' }}>No teams found</span>
            </div>
          )}

          {!loading && !error && filteredTeams.length > 0 && (
            <div className="space-y-1 p-2">
              {filteredTeams.map((team) => (
                <button
                  key={team.apiId}
                  onClick={() => {
                    onSelect(team)
                    onClose()
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors"
                  style={{
                    background:
                      selectedTeamApiId === team.apiId
                        ? 'rgb(217 119 87 / 0.2)'
                        : 'transparent',
                    color: 'rgb(var(--c-text-1))',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedTeamApiId !== team.apiId) {
                      e.currentTarget.style.background = 'rgb(var(--c-overlay-xs))'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      selectedTeamApiId === team.apiId ? 'rgb(217 119 87 / 0.2)' : 'transparent'
                  }}
                >
                  <TeamFlag
                    name={team.name}
                    shortName={team.shortName}
                    flag={team.flag}
                    size="sm"
                  />
                  <span className="font-medium">{team.name}</span>
                  {selectedTeamApiId === team.apiId && (
                    <span
                      className="ml-auto text-xs font-semibold"
                      style={{ color: 'rgb(217 119 87)' }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
