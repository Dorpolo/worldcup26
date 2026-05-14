import { MENTION_DRAG_KEY, type Mention } from '@/lib/mention-types'

export function useDraggable(mention: Mention) {
  return {
    draggable: true as const,
    title: `Drag to chat to mention ${mention.label}`,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData(MENTION_DRAG_KEY, JSON.stringify(mention))
      e.dataTransfer.effectAllowed = 'copy'
    },
  }
}
