'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  onSend: (message: string) => void
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [disabled])

  function handleSubmit() {
    const msg = value.trim()
    if (!msg || disabled) return
    setValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    onSend(msg)
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

  return (
    <div className="space-y-2">
      {/* Suggestions */}
      {!value && !disabled && (
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onSend(s)}
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

      {/* Input row */}
      <div
        className="flex gap-2 items-end rounded-xl px-3 py-2.5 transition-all duration-150"
        style={{ background: 'rgb(255 255 255 / 0.05)', border: '1px solid rgb(255 255 255 / 0.1)' }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); autoResize() }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? 'Thinking…' : 'Ask anything…'}
          rows={1}
          className="flex-1 resize-none bg-transparent text-[13px] leading-relaxed focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed max-h-[140px] overflow-y-auto placeholder:opacity-40"
          style={{ color: 'rgb(240 235 227)' }}
        />
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold"
          style={{
            background: value.trim() && !disabled ? 'rgb(217 119 87)' : 'rgb(255 255 255 / 0.08)',
            color: value.trim() && !disabled ? 'rgb(26 25 23)' : 'rgb(107 100 92)',
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
        Enter to send · Shift+Enter for newline
      </p>
    </div>
  )
}
