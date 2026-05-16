'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSocket } from './useSocket'

export interface LeaderboardEntry {
  userId: string
  name: string
  avatar?: string
  totalPoints: number
  rank: number
  isMe: boolean
}

export function useLeaderboard(leagueId: string, initial: LeaderboardEntry[]) {
  const [entries, setEntries] = useState(initial)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const socketRef = useSocket()

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}/leaderboard`)
      const json = await res.json()
      if (!json.ok) return
      setEntries(json.data)
      setLastUpdate(new Date())
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 1500)
    } catch {
      // silently ignore network errors
    }
  }, [leagueId])

  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    socket.emit('join:league', leagueId)

    socket.on('leaderboard:update', (data: { leagueId: string }) => {
      if (data.leagueId === leagueId) refresh()
    })

    return () => {
      socket.emit('leave:league', leagueId)
      socket.off('leaderboard:update')
    }
  }, [leagueId, refresh, socketRef])

  return { entries, lastUpdate, isAnimating, refresh }
}
