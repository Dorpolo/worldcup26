'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { PAGE_MENTIONS, type Mention } from '@/lib/mention-types'

interface Props {
  query: string
  leagueId: string
  onSelect: (mention: Mention) => void
  onClose: () => void
  anchorRef: React.RefObject<HTMLTextAreaElement | null>
}

interface Section {
  title: string
  items: Mention[]
}

function Flag({ src, alt }: { src?: string; alt: string }) {
  if (!src) return <span className="text-[14px]">🌍</span>
  return <img src={src} alt={alt} className="w-4 h-3 object-cover rounded-[2px]" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
}

function Avatar({ src, name, size = 20 }: { src?: string; name: string; size?: number }) {
  if (src && !src.startsWith('data:') && src.length < 300) {
    return <img src={src} alt={name} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  }
  if (src?.startsWith('data:')) {
    return <img src={src} alt={name} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  }
  return (
    <div className="rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold"
      style={{ width: size, height: size, background: 'rgb(217 119 87 / 0.2)', color: 'rgb(217 119 87)' }}>
      {name?.[0]?.toUpperCase()}
    </div>
  )
}

export function MentionPicker({ query, leagueId, onSelect, onClose, anchorRef }: Props) {
  const [members, setMembers] = useState<Mention[]>([])
  const [matches, setMatches] = useState<Mention[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const activeItemRef = useRef<HTMLButtonElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Filter pages client-side
  const pages = PAGE_MENTIONS.filter((p) =>
    !query || p.label.toLowerCase().includes(query.toLowerCase()) || (p.meta.description as string).toLowerCase().includes(query.toLowerCase())
  )

  // Fetch members + matches from API
  const fetchResults = useCallback(async (q: string) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    try {
      const res = await fetch(
        `/api/leagues/${leagueId}/mention-search?q=${encodeURIComponent(q)}`,
        { signal: abortRef.current.signal }
      )
      if (!res.ok) return
      const json = await res.json()
      setMembers(json.data?.members ?? [])
      setMatches(json.data?.matches ?? [])
    } catch {
      // aborted or network error — ignore
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    fetchResults(query)
    return () => abortRef.current?.abort()
  }, [query, fetchResults])

  // Build flat item list for keyboard nav
  const sections: Section[] = [
    { title: 'Pages', items: pages },
    { title: 'Members', items: members.slice(0, 5) },
    { title: 'Matches', items: matches.slice(0, 6) },
  ].filter((s) => s.items.length > 0)

  const flatItems = sections.flatMap((s) => s.items)

  // Reset active index when results change
  useEffect(() => { setActiveIdx(0) }, [flatItems.length])

  // Scroll active item into view
  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  // Keyboard handler attached to document (so textarea keeps focus)
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (flatItems.length === 0) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx((i) => Math.min(i + 1, flatItems.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        onSelect(flatItems[activeIdx])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey, true)
    return () => document.removeEventListener('keydown', handleKey, true)
  }, [flatItems, activeIdx, onSelect, onClose])

  // Click-outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  if (sections.length === 0 && !loading) {
    return (
      <div
        ref={containerRef}
        className="absolute bottom-full left-0 mb-2 w-72 rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in"
        style={{ background: 'rgb(var(--c-surface))', border: '1px solid rgb(var(--c-border-normal))' }}
      >
        <div className="px-3 py-3 text-[12px]" style={{ color: 'rgb(var(--c-text-3))' }}>
          No results for <span className="font-mono">@{query}</span>
        </div>
      </div>
    )
  }

  let globalIdx = 0

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 mb-2 w-80 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in"
      style={{
        background: 'rgb(var(--c-surface))',
        border: '1px solid rgb(var(--c-border-normal))',
        maxHeight: '340px',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        className="sticky top-0 flex items-center gap-2 px-3 pt-2.5 pb-1.5"
        style={{ background: 'rgb(var(--c-surface))', borderBottom: '1px solid rgb(var(--c-border-subtle))' }}
      >
        <span className="text-[11px] font-semibold" style={{ color: 'rgb(var(--c-text-3))' }}>
          @ mention context
        </span>
        {loading && (
          <span className="ml-auto inline-block w-3 h-3 border-[1.5px] rounded-full animate-spin"
            style={{ borderColor: 'rgb(var(--c-border-normal))', borderTopColor: 'rgb(217 119 87)' }} />
        )}
        {query && (
          <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{ background: 'rgb(217 119 87 / 0.1)', color: 'rgb(217 119 87)' }}>
            {query}
          </span>
        )}
      </div>

      {/* Sections */}
      {sections.map((section) => (
        <div key={section.title}>
          <div
            className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: 'rgb(var(--c-text-3))' }}
          >
            {section.title}
          </div>

          {section.items.map((item) => {
            const idx = globalIdx++
            const isActive = idx === activeIdx

            return (
              <button
                key={item.id}
                ref={isActive ? activeItemRef : undefined}
                onMouseDown={(e) => { e.preventDefault(); onSelect(item) }}
                onMouseEnter={() => setActiveIdx(idx)}
                className="w-full text-left flex items-center gap-2.5 px-3 py-1.5 transition-colors"
                style={{
                  background: isActive ? 'rgb(217 119 87 / 0.08)' : 'transparent',
                  borderLeft: isActive ? '2px solid rgb(217 119 87)' : '2px solid transparent',
                }}
              >
                {/* Icon */}
                {item.type === 'page' && (
                  <span className="text-[16px] shrink-0 w-5 text-center">{item.icon}</span>
                )}
                {item.type === 'user' && (
                  <Avatar
                    src={item.meta.avatar as string | undefined}
                    name={item.label}
                    size={20}
                  />
                )}
                {item.type === 'match' && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Flag src={item.meta.homeFlag as string} alt={item.meta.homeTeam as string} />
                    <span className="text-[9px]" style={{ color: 'rgb(var(--c-text-3))' }}>vs</span>
                    <Flag src={item.meta.awayFlag as string} alt={item.meta.awayTeam as string} />
                  </div>
                )}

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] truncate font-medium" style={{ color: 'rgb(var(--c-text-1))' }}>
                    {item.label}
                  </p>
                  {item.type === 'page' && (
                    <p className="text-[10px] truncate" style={{ color: 'rgb(var(--c-text-3))' }}>
                      {item.meta.description as string}
                    </p>
                  )}
                  {item.type === 'user' && (
                    <p className="text-[10px]" style={{ color: 'rgb(var(--c-text-3))' }}>
                      #{item.meta.rank as number} · {item.meta.points as number} pts
                    </p>
                  )}
                  {item.type === 'match' && (
                    <p className="text-[10px]" style={{ color: 'rgb(var(--c-text-3))' }}>
                      {item.meta.stage as string}{item.meta.group ? ` · Group ${item.meta.group}` : ''} ·{' '}
                      {item.meta.kickoffAt
                        ? new Date(item.meta.kickoffAt as string).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                        : item.meta.status as string}
                    </p>
                  )}
                </div>

                {/* Type badge */}
                <span
                  className="shrink-0 text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide"
                  style={{
                    background: item.type === 'page'
                      ? 'rgb(99 155 255 / 0.12)'
                      : item.type === 'user'
                      ? 'rgb(217 119 87 / 0.1)'
                      : 'rgb(63 185 80 / 0.1)',
                    color: item.type === 'page'
                      ? 'rgb(99 155 255)'
                      : item.type === 'user'
                      ? 'rgb(217 119 87)'
                      : 'rgb(63 185 80)',
                  }}
                >
                  {item.type}
                </span>
              </button>
            )
          })}
        </div>
      ))}

      {/* Footer hint */}
      <div className="sticky bottom-0 px-3 py-1.5 flex gap-3" style={{ background: 'rgb(var(--c-surface))', borderTop: '1px solid rgb(var(--c-border-subtle))' }}>
        {[['↑↓', 'navigate'], ['↵', 'select'], ['esc', 'close']].map(([key, label]) => (
          <span key={key} className="flex items-center gap-1 text-[10px]" style={{ color: 'rgb(var(--c-text-3))' }}>
            <kbd className="px-1 py-0.5 rounded text-[9px]" style={{ background: 'rgb(var(--c-overlay-md))', border: '1px solid rgb(var(--c-border-subtle))' }}>
              {key}
            </kbd>
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
