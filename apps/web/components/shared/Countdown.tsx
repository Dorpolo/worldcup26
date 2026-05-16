'use client'

import { useEffect, useState } from 'react'

// World Cup 2026 opening match: June 11 2026, 23:00 UTC (7pm ET)
const KICKOFF = new Date('2026-06-11T23:00:00Z').getTime()

interface TimeLeft { days: number; hours: number; minutes: number; seconds: number }

function getTimeLeft(): TimeLeft {
  const diff = Math.max(0, KICKOFF - Date.now())
  const days    = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  return { days, hours, minutes, seconds }
}

export function Countdown() {
  const [t, setT] = useState<TimeLeft | null>(null)

  useEffect(() => {
    setT(getTimeLeft())
    const id = setInterval(() => setT(getTimeLeft()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!t) return null

  const isDone = t.days === 0 && t.hours === 0 && t.minutes === 0 && t.seconds === 0

  return (
    <div
      className="rounded-2xl p-5 text-center relative overflow-hidden"
      style={{
        background: 'rgb(var(--surface))',
        border: '1px solid rgb(var(--border-subtle))',
      }}
    >
      {/* subtle glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgb(217 119 87 / 0.06) 0%, transparent 70%)' }}
      />

      <p className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'rgb(var(--text-3))' }}>
        {isDone ? '🏆 The tournament has kicked off!' : '⚽ World Cup 2026 kicks off in'}
      </p>

      {!isDone && (
        <div className="flex items-end justify-center gap-3 md:gap-5">
          <Unit value={t.days}    label="days" />
          <Colon />
          <Unit value={t.hours}   label="hours" />
          <Colon />
          <Unit value={t.minutes} label="min" />
          <Colon />
          <Unit value={t.seconds} label="sec" accent />
        </div>
      )}

      <p className="text-[11px] mt-4" style={{ color: 'rgb(var(--text-3))' }}>
        June 11, 2026 · Opening Match
      </p>
    </div>
  )
}

function Unit({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  const display = String(value).padStart(2, '0')
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="font-mono font-bold tabular-nums"
        style={{
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          lineHeight: 1,
          color: accent ? 'rgb(var(--coral))' : 'rgb(var(--text-1))',
          letterSpacing: '-0.02em',
        }}
      >
        {display}
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgb(var(--text-3))' }}>
        {label}
      </span>
    </div>
  )
}

function Colon() {
  return (
    <span
      className="font-mono font-bold mb-5 animate-pulse"
      style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', color: 'rgb(var(--text-3))', lineHeight: 1 }}
    >
      :
    </span>
  )
}
