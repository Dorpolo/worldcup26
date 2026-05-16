'use client'

import { useState } from 'react'
import type { Conversation } from './ConversationTabStrip'

interface Props {
  conversations: Conversation[]
  activeId: string
  onSelect: (id: string) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export function ConversationHistoryDrawer({ conversations, activeId, onSelect, onRename, onDelete, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase())
  )

  const border = '1px solid rgb(var(--c-border-subtle))'

  function startRename(conv: Conversation) {
    setRenamingId(conv._id)
    setRenameDraft(conv.title)
  }

  function commitRename(id: string) {
    const trimmed = renameDraft.trim()
    if (trimmed && trimmed !== conversations.find((c) => c._id === id)?.title) {
      onRename(id, trimmed)
    }
    setRenamingId(null)
  }

  return (
    <div
      className="absolute top-0 right-0 bottom-0 z-20 flex flex-col animate-slide-in-right"
      style={{
        width: '260px',
        background: 'rgb(var(--c-surface))',
        borderLeft: border,
        boxShadow: '-4px 0 16px rgb(0 0 0 / 0.12)',
      }}
    >
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: border }}>
        <span className="text-[11px] font-semibold flex-1" style={{ color: 'rgb(var(--c-text-1))' }}>
          Conversation history
        </span>
        <button
          onClick={onClose}
          className="text-[14px] opacity-50 hover:opacity-100 transition-opacity"
          style={{ color: 'rgb(var(--c-text-3))' }}
        >×</button>
      </div>

      {/* Search */}
      <div className="shrink-0 px-3 py-2" style={{ borderBottom: border }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="w-full text-[11px] px-2.5 py-1.5 rounded-md outline-none"
          style={{
            background: 'rgb(var(--c-overlay-sm))',
            border: '1px solid rgb(var(--c-border-subtle))',
            color: 'rgb(var(--c-text-1))',
          }}
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-[11px] text-center py-8" style={{ color: 'rgb(var(--c-text-3))' }}>
            No conversations found
          </p>
        )}

        {filtered.map((conv) => {
          const isActive = conv._id === activeId
          const isRenaming = renamingId === conv._id
          const isDeleting = confirmDeleteId === conv._id

          return (
            <div
              key={conv._id}
              className="group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
              style={{
                background: isActive ? 'rgb(217 119 87 / 0.07)' : 'transparent',
                borderLeft: isActive ? '2px solid rgb(217 119 87)' : '2px solid transparent',
              }}
              onClick={() => !isRenaming && !isDeleting && onSelect(conv._id)}
              onDoubleClick={() => startRename(conv)}
            >
              {isRenaming ? (
                <input
                  autoFocus
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onBlur={() => commitRename(conv._id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(conv._id)
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-[11px] px-1.5 py-0.5 rounded outline-none"
                  style={{
                    background: 'rgb(var(--c-overlay-sm))',
                    border: '1px solid rgb(217 119 87 / 0.4)',
                    color: 'rgb(var(--c-text-1))',
                  }}
                />
              ) : isDeleting ? (
                <div className="flex-1 flex items-center gap-1.5">
                  <span className="text-[10px] flex-1" style={{ color: 'rgb(248 81 73)' }}>Delete?</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(conv._id); setConfirmDeleteId(null) }}
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: 'rgb(248 81 73 / 0.15)', color: 'rgb(248 81 73)' }}
                  >Yes</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null) }}
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: 'rgb(var(--c-overlay-md))', color: 'rgb(var(--c-text-3))' }}
                  >No</button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-[11px] truncate" style={{ color: isActive ? 'rgb(217 119 87)' : 'rgb(var(--c-text-2))' }}>
                    {conv.title}
                  </span>
                  {/* Action buttons on hover */}
                  <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); startRename(conv) }}
                      className="text-[9px] px-1 py-0.5 rounded opacity-60 hover:opacity-100"
                      style={{ background: 'rgb(var(--c-overlay-md))', color: 'rgb(var(--c-text-3))' }}
                      title="Rename"
                    >✎</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(conv._id) }}
                      className="text-[9px] px-1 py-0.5 rounded opacity-60 hover:opacity-100"
                      style={{ background: 'rgb(248 81 73 / 0.08)', color: 'rgb(248 81 73)' }}
                      title="Delete"
                    >✕</button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      <div className="shrink-0 px-3 py-2" style={{ borderTop: border }}>
        <p className="text-[10px] text-center" style={{ color: 'rgb(var(--c-text-3))' }}>
          Double-click to rename
        </p>
      </div>
    </div>
  )
}
