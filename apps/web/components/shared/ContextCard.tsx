'use client'

/**
 * Universal "context object" wrapper.
 * Every entity in the app (user, match, stat) is wrapped in this.
 * Dragging sends it to the AI chat as a mention. Clicking navigates.
 */

import Link from 'next/link'
import { MENTION_DRAG_KEY, type Mention } from '@/lib/mention-types'

interface Props {
  mention: Mention
  href?: string
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
}

export function ContextCard({ mention, href, children, className = '', style, onClick }: Props) {
  function onDragStart(e: React.DragEvent) {
    e.dataTransfer.setData(MENTION_DRAG_KEY, JSON.stringify(mention))
    e.dataTransfer.effectAllowed = 'copy'
  }

  const shared = {
    draggable: true as const,
    onDragStart,
    className: `group relative cursor-grab active:cursor-grabbing ${className}`,
    style,
    title: `Drag to AI chat to ask about ${mention.label}`,
  }

  // Drag indicator badge (shown on hover via CSS group)
  const dragHint = (
    <span
      className="absolute top-1 right-1 z-10 text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none select-none"
      style={{ background: 'rgb(217 119 87 / 0.15)', color: 'rgb(217 119 87 / 0.7)', border: '1px solid rgb(217 119 87 / 0.2)' }}
    >
      ⠿ drag
    </span>
  )

  if (href) {
    return (
      <div {...shared}>
        {dragHint}
        <Link href={href} onClick={onClick} className="block">
          {children}
        </Link>
      </div>
    )
  }

  return (
    <div {...shared} onClick={onClick}>
      {dragHint}
      {children}
    </div>
  )
}
