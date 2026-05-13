'use client'

import { useEffect, useState } from 'react'

interface Props {
  lockAt: string | Date
  onLocked?: () => void
}

function formatDuration(ms: number): string {
  if (ms <= 0) return 'Locked'
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function LockCountdown({ lockAt, onLocked }: Props) {
  const lockTime = new Date(lockAt).getTime()
  const [remaining, setRemaining] = useState(() => lockTime - Date.now())

  useEffect(() => {
    if (remaining <= 0) return
    const id = setInterval(() => {
      const r = lockTime - Date.now()
      setRemaining(r)
      if (r <= 0) {
        clearInterval(id)
        onLocked?.()
      }
    }, 1000)
    return () => clearInterval(id)
  }, [lockTime, onLocked, remaining])

  if (remaining <= 0) {
    return <span className="text-xs text-destructive font-medium">Locked</span>
  }

  const isUrgent = remaining < 15 * 60 * 1000

  return (
    <span className={`text-xs font-medium ${isUrgent ? 'text-orange-500' : 'text-muted-foreground'}`}>
      {isUrgent ? '⚠️ ' : '🔒 '}
      {formatDuration(remaining)}
    </span>
  )
}
