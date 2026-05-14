export type MentionType = 'user' | 'match'

export interface Mention {
  type: MentionType
  id: string
  label: string
  meta: Record<string, unknown>
}

export const MENTION_DRAG_KEY = 'application/x-wc26-mention'
