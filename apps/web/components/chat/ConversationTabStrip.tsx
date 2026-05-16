'use client'

import { useRef, useState } from 'react'

export interface Conversation {
  _id: string
  title: string
  messageCount: number
  updatedAt: string
}

interface Props {
  conversations: Conversation[]
  activeId: string
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
}

const TRUNCATE = 20

export function ConversationTabStrip({ conversations, activeId, onSelect, onNew, onDelete }: Props) {
  const [hoverId, setHoverId] = useState<string | null>(null)
  const stripRef = useRef<HTMLDivElement>(null)

  const coral = 'rgb(217 119 87)'
  const border = '1px solid rgb(var(--c-border-subtle))'

  return (
    <div
      ref={stripRef}
      className="shrink-0 flex items-center gap-0 overflow-x-auto scrollbar-none"
      style={{ height: '36px', borderBottom: border, background: 'rgb(var(--c-bg-sidebar))' }}
    >
      {conversations.map((conv) => {
        const isActive = conv._id === activeId
        const title = conv.title.length > TRUNCATE ? conv.title.slice(0, TRUNCATE) + '…' : conv.title
        return (
          <div
            key={conv._id}
            onMouseEnter={() => setHoverId(conv._id)}
            onMouseLeave={() => setHoverId(null)}
            onClick={() => onSelect(conv._id)}
            className="group relative shrink-0 flex items-center gap-1 px-3 h-full cursor-pointer select-none transition-colors"
            style={{
              borderRight: border,
              background: isActive ? 'rgb(217 119 87 / 0.07)' : 'transparent',
              boxShadow: isActive ? `inset 0 -2px 0 ${coral}` : 'none',
              maxWidth: '180px',
            }}
          >
            <span
              className="text-[11px] truncate leading-none"
              style={{ color: isActive ? coral : 'rgb(var(--c-text-2))', maxWidth: '130px' }}
            >
              {title}
            </span>

            {/* Delete × on hover */}
            {hoverId === conv._id && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(conv._id) }}
                className="shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] hover:opacity-100 transition-all ml-0.5"
                style={{ background: 'rgb(var(--c-overlay-md))', color: 'rgb(var(--c-text-3))' }}
              >
                ×
              </button>
            )}
          </div>
        )
      })}

      {/* New conversation */}
      <button
        onClick={onNew}
        className="shrink-0 flex items-center justify-center w-8 h-full text-[14px] transition-colors hover:opacity-80"
        style={{ color: 'rgb(var(--c-text-3))' }}
        title="New conversation"
      >
        +
      </button>
    </div>
  )
}
