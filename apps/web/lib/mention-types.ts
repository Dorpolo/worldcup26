export type MentionType = 'user' | 'match' | 'page'

export interface Mention {
  type: MentionType
  id: string
  label: string
  icon?: string
  meta: Record<string, unknown>
}

export const MENTION_DRAG_KEY = 'application/x-wc26-mention'

// Static page-level mentions (always available, filtered client-side)
export const PAGE_MENTIONS: Mention[] = [
  { type: 'page', id: 'leaderboard',  label: 'Leaderboard',  icon: '📊', meta: { description: 'Current standings and points table' } },
  { type: 'page', id: 'predictions',  label: 'My Predictions', icon: '⚽', meta: { description: 'Your submitted match predictions' } },
  { type: 'page', id: 'cup',          label: 'Cup Bracket',  icon: '🏆', meta: { description: 'Fantasy cup competition bracket' } },
  { type: 'page', id: 'stats',        label: 'Stats',         icon: '📈', meta: { description: 'League analytics and accuracy stats' } },
  { type: 'page', id: 'rules',        label: 'Rules',         icon: '📋', meta: { description: 'Scoring rules and league configuration' } },
  { type: 'page', id: 'upcoming',     label: 'Upcoming Matches', icon: '📅', meta: { description: 'Next fixtures and lock times' } },
  { type: 'page', id: 'all-matches',  label: 'All Fixtures',  icon: '🗓️', meta: { description: 'Full World Cup 2026 schedule' } },
]
