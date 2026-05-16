'use client'

import { useEffect, useState } from 'react'

export interface CountdownState {
  locked: boolean
  secondsLeft: number
  label: string
  urgency: 'none' | 'warning' | 'critical'
}

export function useMatchCountdown(lockAt: string | Date): CountdownState {
  const lockTime = new Date(lockAt).getTime()

  function compute(): CountdownState {
    const now = Date.now()
    const secondsLeft = Math.max(0, Math.floor((lockTime - now) / 1000))
    const locked = secondsLeft === 0

    if (locked) {
      return { locked: true, secondsLeft: 0, label: 'Locked', urgency: 'critical' }
    }

    const h = Math.floor(secondsLeft / 3600)
    const m = Math.floor((secondsLeft % 3600) / 60)
    const s = secondsLeft % 60

    let label: string
    if (h > 0) label = `${h}h ${m}m`
    else if (m > 0) label = `${m}m ${s}s`
    else label = `${s}s`

    const urgency: CountdownState['urgency'] =
      secondsLeft < 60 ? 'critical' : secondsLeft < 900 ? 'warning' : 'none'

    return { locked, secondsLeft, label, urgency }
  }

  const [state, setState] = useState<CountdownState>(compute)

  useEffect(() => {
    if (state.locked) return
    const interval = setInterval(() => {
      const next = compute()
      setState(next)
      if (next.locked) clearInterval(interval)
    }, 1000)
    return () => clearInterval(interval)
  }, [lockTime, state.locked]) // eslint-disable-line react-hooks/exhaustive-deps

  return state
}
