'use client'

import { useState, useEffect } from 'react'
import { MemoryCard, type Memory } from './MemoryCard'

const CATEGORIES = [
  { id: '',                  label: 'All' },
  { id: 'preferences',       label: 'Prefs' },
  { id: 'league-notes',      label: 'League' },
  { id: 'player-observations', label: 'Players' },
  { id: 'strategy',          label: 'Strategy' },
  { id: 'personal',          label: 'Personal' },
]

interface Props {
  leagueId: string
  onClose: () => void
}

export function MemoryPanel({ leagueId, onClose }: Props) {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('')
  const [adding, setAdding] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState('personal')
  const [saving, setSaving] = useState(false)

  const border = '1px solid rgb(var(--c-border-subtle))'

  useEffect(() => {
    loadMemories()
  }, [])

  async function loadMemories() {
    setLoading(true)
    try {
      const res = await fetch('/api/users/me/memories')
      const data = await res.json()
      if (data.ok) setMemories(data.data)
    } catch {}
    setLoading(false)
  }

  async function deleteMemory(id: string) {
    setMemories((prev) => prev.filter((m) => m._id !== id))
    await fetch(`/api/users/me/memories/${id}`, { method: 'DELETE' })
  }

  async function addMemory() {
    const trimmed = newContent.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      const res = await fetch('/api/users/me/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed, category: newCategory }),
      })
      const data = await res.json()
      if (data.ok) {
        setMemories((prev) => [data.data, ...prev])
        setNewContent('')
        setAdding(false)
      }
    } catch {}
    setSaving(false)
  }

  const filtered = activeCategory
    ? memories.filter((m) => m.category === activeCategory)
    : memories

  return (
    <div
      className="absolute top-0 right-0 bottom-0 z-20 flex flex-col animate-slide-in-right"
      style={{
        width: '280px',
        background: 'rgb(var(--c-surface))',
        borderLeft: border,
        boxShadow: '-4px 0 16px rgb(0 0 0 / 0.12)',
      }}
    >
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: border }}>
        <span className="text-[13px]">🧠</span>
        <span className="text-[11px] font-semibold flex-1" style={{ color: 'rgb(var(--c-text-1))' }}>
          Memory
        </span>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-[10px] px-2 py-1 rounded transition-all"
          style={{
            background: adding ? 'rgb(217 119 87 / 0.15)' : 'rgb(var(--c-overlay-md))',
            color: adding ? 'rgb(217 119 87)' : 'rgb(var(--c-text-3))',
            border: adding ? '1px solid rgb(217 119 87 / 0.3)' : '1px solid rgb(var(--c-border-subtle))',
          }}
        >
          + Add
        </button>
        <button
          onClick={onClose}
          className="text-[14px] opacity-50 hover:opacity-100 transition-opacity ml-1"
          style={{ color: 'rgb(var(--c-text-3))' }}
        >×</button>
      </div>

      {/* Add form */}
      {adding && (
        <div
          className="shrink-0 px-3 py-3 space-y-2 animate-fade-in"
          style={{ borderBottom: border, background: 'rgb(var(--c-overlay-xs))' }}
        >
          <textarea
            autoFocus
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="What should I remember?…"
            rows={3}
            className="w-full text-[11px] px-2.5 py-2 rounded-lg resize-none outline-none"
            style={{
              background: 'rgb(var(--c-overlay-sm))',
              border: '1px solid rgb(var(--c-border-normal))',
              color: 'rgb(var(--c-text-1))',
            }}
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="w-full text-[11px] px-2 py-1.5 rounded-lg outline-none cursor-pointer"
            style={{
              background: 'rgb(var(--c-overlay-sm))',
              border: '1px solid rgb(var(--c-border-subtle))',
              color: 'rgb(var(--c-text-2))',
            }}
          >
            {CATEGORIES.slice(1).map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={addMemory}
              disabled={!newContent.trim() || saving}
              className="flex-1 text-[11px] py-1.5 rounded-lg font-semibold transition-all disabled:opacity-40"
              style={{ background: 'rgb(217 119 87)', color: '#fff' }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => { setAdding(false); setNewContent('') }}
              className="text-[11px] px-3 py-1.5 rounded-lg"
              style={{ background: 'rgb(var(--c-overlay-md))', color: 'rgb(var(--c-text-3))' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div
        className="shrink-0 flex items-center gap-1 px-3 py-2 overflow-x-auto scrollbar-none"
        style={{ borderBottom: border }}
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className="shrink-0 text-[10px] px-2 py-0.5 rounded-full transition-all"
            style={{
              background: activeCategory === cat.id ? 'rgb(217 119 87 / 0.15)' : 'rgb(var(--c-overlay-sm))',
              border: activeCategory === cat.id ? '1px solid rgb(217 119 87 / 0.35)' : '1px solid transparent',
              color: activeCategory === cat.id ? 'rgb(217 119 87)' : 'rgb(var(--c-text-3))',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Memory list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {loading && (
          <p className="text-[11px] text-center py-6" style={{ color: 'rgb(var(--c-text-3))' }}>
            Loading…
          </p>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <p className="text-[20px]">🧠</p>
            <p className="text-[11px]" style={{ color: 'rgb(var(--c-text-3))' }}>
              No memories yet. The AI will remember things you tell it.
            </p>
          </div>
        )}

        {filtered.map((memory) => (
          <MemoryCard key={memory._id} memory={memory} onDelete={deleteMemory} />
        ))}
      </div>

      {/* Footer */}
      {memories.length > 0 && (
        <div className="shrink-0 px-3 py-2" style={{ borderTop: border }}>
          <p className="text-[10px] text-center" style={{ color: 'rgb(var(--c-text-3))' }}>
            {memories.length} {memories.length === 1 ? 'memory' : 'memories'} stored
          </p>
        </div>
      )}
    </div>
  )
}
