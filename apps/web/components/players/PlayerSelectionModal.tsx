'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, X, Loader2 } from 'lucide-react'

interface Player {
  id: string
  apiPlayerId?: string
  name: string
  team: string
  position: string
  shirtNumber?: number
  nationality?: string
  photoUrl?: string
  stats?: {
    goals: number
    assists: number
    appearances: number
  }
}

interface Props {
  onSelect: (player: Player) => void
  onClose: () => void
  selectedPlayerId?: string
  teamFilter?: string
  title?: string
}

export function PlayerSelectionModal({ onSelect, onClose, selectedPlayerId, teamFilter, title = 'Select Player' }: Props) {
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState<string>('')
  const [team, setTeam] = useState<string>('')
  const [players, setPlayers] = useState<Player[]>([])
  const [teams, setTeams] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [teamsLoading, setTeamsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [skip, setSkip] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  // Fetch unique teams
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch('/api/players?limit=1000')
        const json = await res.json()
        if (json.ok) {
          const uniqueTeams = Array.from(new Set(json.data.players.map((p: Player) => p.team))).sort() as string[]
          setTeams(uniqueTeams)
        }
      } catch (err) {
        console.error('Failed to load teams:', err)
      } finally {
        setTeamsLoading(false)
      }
    }
    fetchTeams()
  }, [])

  // Fetch players
  const fetchPlayers = useCallback(async (newSkip = 0) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        limit: '20',
        skip: newSkip.toString(),
      })

      if (search) params.append('search', search)
      if (position) params.append('position', position)
      const filterTeam = team || teamFilter
      if (filterTeam) params.append('team', filterTeam)

      const res = await fetch(`/api/players?${params}`)
      const json = await res.json()

      if (json.ok) {
        const newPlayers = newSkip === 0
          ? json.data.players
          : [...players, ...json.data.players]

        setPlayers(newPlayers)
        setHasMore(json.data.hasMore)
      } else {
        setError('Failed to load players')
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [search, position, team, teamFilter, players])

  // Initial fetch
  useEffect(() => {
    setSkip(0)
    fetchPlayers(0)
  }, [search, position, team, teamFilter])

  const handleLoadMore = () => {
    const newSkip = skip + 20
    setSkip(newSkip)
    fetchPlayers(newSkip)
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-gray-900 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        style={{ background: 'rgb(var(--c-bg))' }}
      >
        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between shrink-0"
          style={{ borderColor: 'rgb(var(--c-border-normal))' }}>
          <h2 className="text-lg font-bold" style={{ color: 'rgb(var(--c-text-1))' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:opacity-75 transition-opacity"
          >
            <X className="w-5 h-5" style={{ color: 'rgb(var(--c-text-3))' }} />
          </button>
        </div>

        {/* Filters */}
        <div className="border-b p-4 space-y-3 shrink-0"
          style={{ borderColor: 'rgb(var(--c-border-normal))' }}>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'rgb(var(--c-text-3))' }} />
            <input
              type="text"
              placeholder="Search player name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border focus:outline-none"
              style={{
                background: 'rgb(var(--c-overlay-xs))',
                border: '1px solid rgb(var(--c-border-normal))',
                color: 'rgb(var(--c-text-1))',
              }}
            />
          </div>

          {/* Team Filter */}
          {!teamFilter && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'rgb(var(--c-text-2))' }}>Teams</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {teamsLoading ? (
                  <p className="text-xs" style={{ color: 'rgb(var(--c-text-3))' }}>Loading teams...</p>
                ) : (
                  teams.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTeam(team === t ? '' : t)}
                      className="px-3 py-1.5 rounded-lg font-semibold text-sm transition-colors whitespace-nowrap shrink-0"
                      style={{
                        background: team === t ? 'rgb(217 119 87)' : 'rgb(var(--c-overlay-xs))',
                        color: team === t ? 'rgb(var(--c-bg))' : 'rgb(var(--c-text-1))',
                        border: `1px solid ${team === t ? 'rgb(217 119 87)' : 'rgb(var(--c-border-normal))'}`,
                      }}
                    >
                      {t}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Position Filter */}
          {!teamFilter && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'rgb(var(--c-text-2))' }}>Position</p>
              <div className="flex gap-2">
                {['GK', 'DEF', 'MID', 'FWD'].map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setPosition(position === pos ? '' : pos)}
                    className="px-3 py-1.5 rounded-lg font-semibold text-sm transition-colors"
                    style={{
                      background: position === pos ? 'rgb(217 119 87)' : 'rgb(var(--c-overlay-xs))',
                      color: position === pos ? 'rgb(var(--c-bg))' : 'rgb(var(--c-text-1))',
                      border: `1px solid ${position === pos ? 'rgb(217 119 87)' : 'rgb(var(--c-border-normal))'}`,
                    }}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Players List */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div
              className="p-4 text-center text-sm"
              style={{ color: 'rgb(248 81 73)' }}
            >
              {error}
            </div>
          )}

          {loading && players.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'rgb(var(--c-text-3))' }} />
            </div>
          ) : players.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <p className="text-2xl mb-2">🔍</p>
                <p className="text-sm" style={{ color: 'rgb(var(--c-text-3))' }}>
                  No players found
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {players.map((player) => (
                <button
                  key={player.id}
                  onClick={() => {
                    onSelect(player)
                    onClose()
                  }}
                  className="w-full text-left rounded-lg p-3 transition-colors hover:brightness-110"
                  style={{
                    background: selectedPlayerId === player.id ? 'rgb(217 119 87 / 0.15)' : 'rgb(var(--c-overlay-xs))',
                    border: selectedPlayerId === player.id ? '1px solid rgb(217 119 87 / 0.3)' : '1px solid transparent',
                  }}
                >
                  <div className="flex items-start gap-3">
                    {player.photoUrl ? (
                      <img
                        src={player.photoUrl}
                        alt={player.name}
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
                        style={{ background: 'rgb(217 119 87 / 0.15)', color: 'rgb(217 119 87)' }}
                      >
                        {player.name.charAt(0)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: 'rgb(var(--c-text-1))' }}>
                        {player.name}
                      </p>
                      <p className="text-xs" style={{ color: 'rgb(var(--c-text-3))' }}>
                        {player.team}
                        {player.shirtNumber && ` • #${player.shirtNumber}`}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgb(var(--c-overlay-md))', color: 'rgb(var(--c-text-3))' }}>
                          {player.position}
                        </span>
                        {player.stats?.goals !== undefined && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgb(63 185 80 / 0.15)', color: 'rgb(63 185 80)' }}>
                            {player.stats.goals} goals
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Load More */}
        {hasMore && players.length > 0 && (
          <div className="border-t p-4 text-center shrink-0"
            style={{ borderColor: 'rgb(var(--c-border-normal))' }}>
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="px-4 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
              style={{
                background: 'rgb(217 119 87 / 0.1)',
                color: 'rgb(217 119 87)',
              }}
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
