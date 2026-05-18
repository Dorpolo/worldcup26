'use client'

import { usePathname } from 'next/navigation'
import { ChatPanel } from '@/components/chat/ChatPanel'

interface Props {
  children: React.ReactNode
  leagueSlug: string
  leagueId: string
  leagueName: string
  userName: string
  userRank: number
  userPoints: number
  hasAiKey: boolean
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
}: Props) {
  const pathname = usePathname()
  const isChatPage =
    pathname === `/leagues/${leagueSlug}` ||
    pathname === `/leagues/${leagueSlug}/`

  if (isChatPage) {
    // Chat page: full-width, no sidebar — ChatPanel renders fullScreen inside
    return <div className="h-full overflow-hidden">{children}</div>
  }

  // All other pages: content + resizable Declan sidebar on the right
  return (
    <div className="flex h-full overflow-hidden">
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
  )
}
