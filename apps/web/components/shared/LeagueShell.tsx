'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { LeagueTabNav } from './LeagueTabNav'

interface Props {
  children: React.ReactNode
  leagueSlug: string
  leagueId: string
  leagueName: string
  userName: string
  userRank: number
  userPoints: number
  hasAiKey: boolean
  navTabs?: Array<{ href: string; label: string; icon: string }>
  base?: string
  isOwner?: boolean
}

export function LeagueShell({
  children,
  leagueSlug,
  leagueId,
  leagueName,
  userName,
  userRank,
  userPoints,
  hasAiKey,
  navTabs = [],
  base = `/leagues/${leagueSlug}`,
  isOwner = false,
}: Props) {
  const pathname = usePathname()
  const isChatPage =
    pathname === `/leagues/${leagueSlug}` ||
    pathname === `/leagues/${leagueSlug}/`

  const [showMobileNav, setShowMobileNav] = useState(false)

  if (isChatPage) {
    // Chat page: full-width, no sidebar — ChatPanel renders fullScreen inside
    return <div className="flex flex-col flex-1 overflow-hidden min-h-0">{children}</div>
  }

  // All other pages: content + resizable Declan sidebar on the right
  return (
    <div className="flex flex-1 overflow-hidden min-h-0 flex-col lg:flex-row">
      {/* Mobile navigation toggle */}
      <div className="lg:hidden shrink-0 flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgb(var(--c-border-subtle))' }}>
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: 'rgb(var(--c-text-1))' }}>
            {leagueName}
          </p>
        </div>
        <button
          onClick={() => setShowMobileNav(!showMobileNav)}
          className="text-sm px-2 py-1 rounded"
          style={{
            background: 'rgb(var(--c-overlay-sm))',
            color: 'rgb(var(--c-text-1))',
          }}
        >
          {showMobileNav ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile navigation (shown when toggled) */}
      {showMobileNav && (
        <div className="lg:hidden shrink-0 overflow-y-auto px-2 py-2"
          style={{ borderBottom: '1px solid rgb(var(--c-border-subtle))' }}>
          <LeagueTabNav base={base} tabs={navTabs} vertical={false} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-hidden min-w-0 flex flex-col lg:flex-row">
        <div className="flex-1 overflow-hidden min-w-0">{children}</div>
        <ChatPanel
          leagueId={leagueId}
          leagueName={leagueName}
          userName={userName}
          userRank={userRank}
          userPoints={userPoints}
          hasAiKey={hasAiKey}
        />
      </div>
    </div>
  )
}
