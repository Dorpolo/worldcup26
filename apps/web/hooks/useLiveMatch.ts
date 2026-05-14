'use client'

import { useEffect, useState } from 'react'
import { useSocket } from './useSocket'

export interface LiveScore {
  homeScore: number
  awayScore: number
  status: string
  minute?: number
}

export function useLiveMatch(matchId: string, initialScore?: LiveScore) {
  const [liveScore, setLiveScore] = useState<LiveScore | null>(initialScore ?? null)
  const [isLocked, setIsLocked] = useState(false)
  const socketRef = useSocket()

  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    socket.emit('join:match', matchId)

    socket.on('match:score', (data: { matchId: string } & LiveScore) => {
      if (data.matchId === matchId) {
        setLiveScore({ homeScore: data.homeScore, awayScore: data.awayScore, status: data.status, minute: data.minute })
      }
    })

    socket.on('match:locked', (data: { matchId: string }) => {
      if (data.matchId === matchId) setIsLocked(true)
    })

    return () => {
      socket.emit('leave:match', matchId)
      socket.off('match:score')
      socket.off('match:locked')
    }
  }, [matchId, socketRef])

  return { liveScore, isLocked }
}
