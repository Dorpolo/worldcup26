'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MENTION_DRAG_KEY, type Mention } from '@/lib/mention-types'
import { MentionPicker } from './MentionPicker'

interface Props {
  onSend: (message: string, mentions: Mention[]) => void
  disabled?: boolean
  leagueId: string
}

interface ActiveMention {
  query: string       // text after @
  startIndex: number  // position of the @ in the textarea value
}

export function ChatInput({ onSend, disabled, leagueId }: Props) {
  const [value, setValue] = useState('')
  const [mentions, setMentions] = useState<Mention[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [activeMention, setActiveMention] = useState<ActiveMention | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!disabled && textareaRef.current) textareaRef.current.focus()
  }, [disabled])

  function handleSubmit() {
    const msg = value.trim()
    if ((!msg && mentions.length === 0) || disabled) return
    onSend(msg, mentions)
    setValue('')
    setMentions([])
    setActiveMention(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Let MentionPicker handle arrows/enter/escape when open
    if (activeMention) return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }

  // Detect active @mention by scanning backwards from cursor
  const detectMention = useCallback((text: string, cursorPos: number): ActiveMention | null => {
    // Scan back from cursor to find @ not preceded by non-whitespace
    for (let i = cursorPos - 1; i >= 0; i--) {
      const ch = text[i]
      if (ch === '@') {
        // Valid if @ is at start or preceded by whitespace
        const prev = i === 0 ? ' ' : text[i - 1]
        if (/\s/.test(prev)) {
          const query = text.slice(i + 1, cursorPos)
          // Stop if query has a space (user typed past the mention word)
          if (query.includes(' ')) return null
          return { query, startIndex: i }
        }
        return null
      }
      // Stop at whitespace — no @ found in this word
      if (/\s/.test(ch)) return null
    }
    return null
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newVal = e.target.value
    setValue(newVal)
    autoResize()

    const cursor = e.target.selectionStart ?? newVal.length
    const mention = detectMention(newVal, cursor)
    setActiveMention(mention)
  }

  function handleSelect(e: React.SyntheticEvent<HTMLTextAreaElement>) {
    const el = e.target as HTMLTextAreaElement
    const cursor = el.selectionStart ?? value.length
    setActiveMention(detectMention(value, cursor))
  }

  function handleMentionSelect(mention: Mention) {
    if (!activeMention) return

    // Remove the @query text from the textarea
    const before = value.slice(0, activeMention.startIndex)
    const after = value.slice(activeMention.startIndex + 1 + activeMention.query.length)
    const newVal = before + after
    setValue(newVal)
    setActiveMention(null)

    // Add to pills (deduplicate)
    setMentions((prev) =>
      prev.find((m) => m.id === mention.id) ? prev : [...prev, mention]
    )

    // Restore focus and cursor
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        const pos = before.length
        textareaRef.current.setSelectionRange(pos, pos)
      }
    })
  }

  function closePicker() {
    setActiveMention(null)
  }

  function removeMention(id: string) {
    setMentions((prev) => prev.filter((m) => m.id !== id))
  }

  // Drag-and-drop (existing behaviour preserved)
  function handleDragOver(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes(MENTION_DRAG_KEY)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragOver(true)
  }
  function handleDragLeave() { setIsDragOver(false) }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const raw = e.dataTransfer.getData(MENTION_DRAG_KEY)
    if (!raw) return
    try {
      const mention = JSON.parse(raw) as Mention
      setMentions((prev) => prev.find((m) => m.id === mention.id) ? prev : [...prev, mention])
      textareaRef.current?.focus()
    } catch {}
  }

  const canSend = (value.trim() || mentions.length > 0) && !disabled

  const pillColor = (type: string) => ({
    user:  { bg: 'rgb(217 119 87 / 0.12)', border: 'rgb(217 119 87 / 0.3)', color: 'rgb(217 119 87)' },
    match: { bg: 'rgb(63 185 80 / 0.10)',  border: 'rgb(63 185 80 / 0.25)',  color: 'rgb(63 185 80)' },
    page:  { bg: 'rgb(99 155 255 / 0.10)', border: 'rgb(99 155 255 / 0.25)', color: 'rgb(99 155 255)' },
  }[type] ?? { bg: 'rgb(var(--c-overlay-md))', border: 'rgb(var(--c-border-normal))', color: 'rgb(var(--c-text-2))' })

  const pillIcon = (m: Mention) => {
    if (m.type === 'page') return m.icon ?? '📄'
    if (m.type === 'user') return '@'
    if (m.type === 'match') return '⚽'
    return '·'
  }

  return (
    <div
      className="space-y-2"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Mention pills */}
      {mentions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {mentions.map((m) => {
            const c = pillColor(m.type)
            return (
              <span
                key={m.id}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
                style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}
              >
                <span className="opacity-60 text-[10px]">{pillIcon(m)}</span>
                {m.label}
                <button
                  onClick={() => removeMention(m.id)}
                  className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity"
                  style={{ lineHeight: 1 }}
                >
                  ×
                </button>
              </span>
            )
          })}
        </div>
      )}

      {/* Input row — position:relative so picker can anchor */}
      <div className="relative" ref={containerRef}>
        {/* @ Mention picker */}
        {activeMention && (
          <MentionPicker
            query={activeMention.query}
            leagueId={leagueId}
            onSelect={handleMentionSelect}
            onClose={closePicker}
            anchorRef={textareaRef}
          />
        )}

        <div
          className="flex gap-2 items-end rounded-xl px-3 py-2.5 transition-all duration-150"
          style={{
            background: isDragOver ? 'rgb(217 119 87 / 0.08)' : 'rgb(var(--c-overlay-md))',
            border: isDragOver
              ? '1px dashed rgb(217 119 87 / 0.6)'
              : '1px solid rgb(var(--c-border-normal))',
          }}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onSelect={handleSelect}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={
              isDragOver
                ? 'Drop to mention…'
                : mentions.length > 0
                ? `Ask about ${mentions.map((m) => m.label).join(', ')}…`
                : disabled
                ? 'Thinking…'
                : 'Ask anything… type @ to add context'
            }
            rows={1}
            className="flex-1 resize-none bg-transparent text-[13px] leading-relaxed focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed max-h-[140px] overflow-y-auto placeholder:opacity-40"
            style={{ color: 'rgb(var(--c-text-1))' }}
          />
          <button
            onClick={handleSubmit}
            disabled={!canSend}
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold"
            style={{
              background: canSend ? 'rgb(217 119 87)' : 'rgb(var(--c-border-normal))',
              color: canSend ? 'rgb(var(--c-bg))' : 'rgb(var(--c-text-3))',
            }}
          >
            {disabled ? (
              <span className="inline-block w-3 h-3 border-[1.5px] rounded-full animate-spin"
                style={{ borderColor: 'rgb(var(--c-text-3))', borderTopColor: 'rgb(var(--c-text-2))' }} />
            ) : (
              '↑'
            )}
          </button>
        </div>
      </div>

      <p className="text-[10px] text-center" style={{ color: 'rgb(var(--c-surface-3))' }}>
        Enter to send · @ to add context · Drag any card here
      </p>
    </div>
  )
}
