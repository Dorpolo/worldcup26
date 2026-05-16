'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80 text-sm"
      style={{
        background: 'rgb(var(--surface-2))',
        border: '1px solid rgb(var(--border-subtle))',
        color: 'rgb(var(--text-3))',
      }}
    >
      {isDark ? '☀' : '◑'}
    </button>
  )
}
