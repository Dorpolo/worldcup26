'use client'

import { useState, useRef, useEffect } from 'react'
import { MENTION_DRAG_KEY, type Mention } from '@/lib/mention-types'

interface Props {
  onSend: (message: string, mentions: Mention[]) => void
  disabled?: boolean
}

const SUGGESTIONS = [
  'How am I doing?',
  'What should I predict?',
  'Show standings',
  'Explain the cup',
]

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('')
  const [mentions, setMentions] = useState<Mention[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!disabled && textareaRef.current) textareaRef.current.focus()
  }, [disabled])

  function handleSubmit() {
    const msg = value.trim()
    if ((!msg && mentions.length === 0) || disabled) return
    onSend(msg, mentions)
    setValue('')
    setMentions([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKeyDown(e: React.KeyboardEvent) {
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

  function handleDragOver(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes(MENTION_DRAG_KEY)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragOver(true)
  }

  function handleDragLeave() {
    setIsDragOver(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const raw = e.dataTransfer.getData(MENTION_DRAG_KEY)
    if (!raw) return
    try {
      const mention = JSON.parse(raw) as Mention
      setMentions((prev) =>
        prev.find((m) => m.id === mention.id) ? prev : [...prev, mention]
      )
      textareaRef.current?.focus()
    } catch {}
  }

  function removeMention(id: string) {
    setMentions((prev) => prev.filter((m) => m.id !== id))
  }

  const canSend = (value.trim() || mentions.length > 0) && !disabled

  return (
    <div
      className="space-y-2"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Suggestions (only when empty + no mentions) */}
      {!value && mentions.length === 0 && !disabled && (
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onSend(s, [])}
              className="text-[11px] px-2.5 py-1 rounded-full transition-all duration-150"
              style={{
                background: 'rgb(255 255 255 / 0.05)',
                border: '1px solid rgb(255 255 255 / 0.1)',
                color: 'rgb(160 152 144)',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Mention pills */}
      {mentions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {mentions.map((m) => (
            <span
              key={m.id}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
              style={{
                background: m.type === 'user'
                  ? 'rgb(217 119 87 / 0.15)'
                  : 'rgb(63 185 80 / 0.12)',
                border: m.type === 'user'
                  ? '1px solid rgb(217 119 87 / 0.3)'
                  : '1px solid rgb(63 185 80 / 0.25)',
                color: m.type === 'user' ? 'rgb(217 119 87)' : 'rgb(63 185 80)',
              }}
            >
              <span className="opacity-60">{m.type === 'user' ? '@' : '⚽'}</span>
              {m.label}
              <button
                onClick={() => removeMention(m.id)}
                className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity"
                style={{ lineHeight: 1 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input row */}
      <div
        className="flex gap-2 items-end rounded-xl px-3 py-2.5 transition-all duration-150"
        style={{
          background: isDragOver ? 'rgb(217 119 87 / 0.08)' : 'rgb(255 255 255 / 0.05)',
          border: isDragOver
            ? '1px dashed rgb(217 119 87 / 0.6)'
            : '1px solid rgb(255 255 255 / 0.1)',
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); autoResize() }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={
            isDragOver
              ? 'Drop to mention…'
              : mentions.length > 0
              ? `Ask about ${mentions.map((m) => m.label).join(', ')}…`
              : disabled
              ? 'Thinking…'
              : 'Ask anything… or drag a player/match here'
          }
          rows={1}
          className="flex-1 resize-none bg-transparent text-[13px] leading-relaxed focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed max-h-[140px] overflow-y-auto placeholder:opacity-40"
          style={{ color: 'rgb(240 235 227)' }}
        />
        <button
          onClick={handleSubmit}
          disabled={!canSend}
          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold"
          style={{
            background: canSend ? 'rgb(217 119 87)' : 'rgb(255 255 255 / 0.08)',
            color: canSend ? 'rgb(26 25 23)' : 'rgb(107 100 92)',
          }}
        >
          {disabled ? (
            <span className="inline-block w-3 h-3 border-[1.5px] rounded-full animate-spin"
              style={{ borderColor: 'rgb(107 100 92)', borderTopColor: 'rgb(160 152 144)' }} />
          ) : (
            '↑'
          )}
        </button>
      </div>

      <p className="text-[10px] text-center" style={{ color: 'rgb(58 55 51)' }}>
        Enter to send · Drag any card here to add context
      </p>
    </div>
  )
}
