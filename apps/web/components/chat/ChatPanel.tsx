'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { ChatWindow, type Message } from './ChatWindow'
import { ConversationTabStrip, type Conversation } from './ConversationTabStrip'
import { ConversationHistoryDrawer } from './ConversationHistoryDrawer'
import { MemoryPanel } from './MemoryPanel'

interface Props {
  leagueId: string
  leagueName: string
  userName: string
  userRank: number
  userPoints: number
  initialMessages?: Message[]
  hasAiKey: boolean
}

const MIN_WIDTH = 280
const MAX_WIDTH = 720
const DEFAULT_WIDTH = 420

export interface AIConfig {
  model: 'claude-haiku' | 'claude-sonnet' | 'gpt-4o-mini'
  temperature: number
  systemNote: string
}

const MODEL_LABELS: Record<AIConfig['model'], { label: string; hint: string }> = {
  'claude-haiku':  { label: 'Claude Haiku',  hint: 'Fast · low cost' },
  'claude-sonnet': { label: 'Claude Sonnet', hint: 'Smart · recommended' },
  'gpt-4o-mini':   { label: 'GPT-4o mini',   hint: 'OpenAI · sk- key' },
}

export function ChatPanel(props: Props) {
  const { leagueId, hasAiKey: initialHasKey } = props
  const [open, setOpen] = useState(true)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [showConfig, setShowConfig] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showMemory, setShowMemory] = useState(false)
  const [config, setConfig] = useState<AIConfig>({ model: 'claude-haiku', temperature: 0.7, systemNote: '' })

  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string>('')
  const [convsLoaded, setConvsLoaded] = useState(false)

  // Memory count badge
  const [memoryCount, setMemoryCount] = useState(0)

  // AI key inline state
  const [hasKey, setHasKey] = useState(initialHasKey)
  const [editingKey, setEditingKey] = useState(!initialHasKey)
  const [keyDraft, setKeyDraft] = useState('')
  const [keyVisible, setKeyVisible] = useState(false)
  const [keySaving, setKeySaving] = useState(false)
  const [keyError, setKeyError] = useState('')
  const [keySuccess, setKeySuccess] = useState(false)

  const border = '1px solid rgb(var(--c-border-subtle))'
  const surface = 'rgb(var(--c-bg-sidebar))'
  const text1 = 'rgb(var(--c-text-1))'
  const text3 = 'rgb(var(--c-text-3))'
  const coral = 'rgb(var(--coral))'

  // Load conversations on mount
  useEffect(() => {
    if (!leagueId) return
    fetch(`/api/chat/conversations?leagueId=${leagueId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.data.length > 0) {
          setConversations(data.data)
          setActiveConversationId(data.data[0]._id)
        } else {
          // No conversations yet — create the first one
          createConversation()
        }
        setConvsLoaded(true)
      })
      .catch(() => setConvsLoaded(true))

    // Load memory count
    fetch('/api/users/me/memories')
      .then((r) => r.json())
      .then((d) => { if (d.ok) setMemoryCount(d.data.length) })
      .catch(() => {})
  }, [leagueId])

  async function createConversation(): Promise<string> {
    const res = await fetch('/api/chat/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId, title: 'New conversation' }),
    })
    const data = await res.json()
    if (data.ok) {
      const conv = data.data
      setConversations((prev) => [conv, ...prev])
      setActiveConversationId(conv._id)
      return conv._id
    }
    return ''
  }

  async function deleteConversation(id: string) {
    setConversations((prev) => prev.filter((c) => c._id !== id))
    if (activeConversationId === id) {
      const remaining = conversations.filter((c) => c._id !== id)
      if (remaining.length > 0) {
        setActiveConversationId(remaining[0]._id)
      } else {
        createConversation()
      }
    }
    await fetch(`/api/chat/conversations/${id}`, { method: 'DELETE' })
  }

  async function renameConversation(id: string, title: string) {
    setConversations((prev) => prev.map((c) => c._id === id ? { ...c, title } : c))
    await fetch(`/api/chat/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
  }

  function handleTitleGenerated(conversationId: string, title: string) {
    setConversations((prev) => prev.map((c) => c._id === conversationId ? { ...c, title } : c))
  }

  // AI key management
  async function saveKey() {
    const trimmed = keyDraft.trim()
    if (!trimmed) return
    if (!trimmed.startsWith('sk-ant-') && !trimmed.startsWith('sk-')) {
      setKeyError('Key must start with sk-ant- (Claude) or sk- (OpenAI)')
      return
    }
    setKeySaving(true)
    setKeyError('')
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiApiKey: trimmed }),
      })
      if (!res.ok) throw new Error()
      setHasKey(true)
      setEditingKey(false)
      setKeyDraft('')
      setKeySuccess(true)
      setTimeout(() => setKeySuccess(false), 3000)
    } catch {
      setKeyError('Failed to save. Try again.')
    } finally {
      setKeySaving(false)
    }
  }

  async function removeKey() {
    setKeySaving(true)
    try {
      await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiApiKey: '' }),
      })
      setHasKey(false)
      setEditingKey(true)
      setKeyDraft('')
    } catch {}
    setKeySaving(false)
  }

  // Drag-to-resize
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    startX.current = e.clientX
    startWidth.current = width
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [width])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return
      const delta = startX.current - e.clientX
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta))
      setWidth(next)
    }
    function onMouseUp() {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <>
      {/* Collapsed strip */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="shrink-0 flex flex-col items-center justify-center gap-3 w-10 transition-colors wc-chat-panel"
          style={{ borderLeft: border, background: surface, color: text3 }}
          title="Open Polo Market"
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest rotate-[-90deg] whitespace-nowrap" style={{ color: coral }}>Polo Market</span>
          <span className="text-base">›</span>
        </button>
      )}

      {open && (
        <div
          className="shrink-0 flex chat-panel-enter wc-chat-panel"
          style={{ width: `${width}px`, borderLeft: border, background: surface, position: 'relative' }}
        >
          {/* Drag handle */}
          <div
            onMouseDown={onMouseDown}
            className="absolute left-0 top-0 bottom-0 w-1 z-10 group"
            style={{ cursor: 'col-resize' }}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgb(217 119 87 / 0.35)' }} />
          </div>

          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            {/* Header */}
            <div
              className="wc-panel-header shrink-0 flex items-center gap-2 px-3 py-2.5"
              style={{ borderBottom: border }}
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{ background: 'linear-gradient(135deg, #d97757, #c8664a)', color: '#fff' }}>
                B
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold truncate" style={{ color: text1 }}>Polo Market</p>
              </div>

              {/* Memory toggle */}
              <button
                onClick={() => { setShowMemory((v) => !v); setShowHistory(false); setShowConfig(false) }}
                className="relative flex items-center gap-1 text-[11px] px-1.5 py-1 rounded-md transition-all"
                style={{
                  background: showMemory ? 'rgb(217 119 87 / 0.12)' : 'rgb(var(--c-overlay-xs))',
                  color: showMemory ? coral : text3,
                }}
                title="Memory"
              >
                🧠
                {memoryCount > 0 && (
                  <span
                    className="text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center"
                    style={{ background: 'rgb(217 119 87)', color: '#fff', fontSize: '8px' }}
                  >
                    {memoryCount > 9 ? '9+' : memoryCount}
                  </span>
                )}
              </button>

              {/* History toggle */}
              <button
                onClick={() => { setShowHistory((v) => !v); setShowMemory(false); setShowConfig(false) }}
                className="text-[11px] px-1.5 py-1 rounded-md transition-all"
                style={{
                  background: showHistory ? 'rgb(217 119 87 / 0.12)' : 'rgb(var(--c-overlay-xs))',
                  color: showHistory ? coral : text3,
                }}
                title="Conversation history"
              >
                ⎇
              </button>

              {/* Key status dot */}
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                title={hasKey ? 'Declan is ready' : 'Declan needs a key — click Config'}
                style={{ background: hasKey ? 'rgb(63 185 80)' : 'rgb(240 160 48)' }}
              />

              <button
                onClick={() => { setShowConfig((v) => !v); setShowHistory(false); setShowMemory(false) }}
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md transition-all hover:opacity-90 font-medium"
                style={{
                  background: showConfig ? 'rgb(217 119 87 / 0.15)' : 'rgb(217 119 87 / 0.08)',
                  border: showConfig ? '1px solid rgb(217 119 87 / 0.4)' : '1px solid rgb(217 119 87 / 0.2)',
                  color: coral,
                }}
              >
                <span>⚙</span>
                <span>Config</span>
                {!hasKey && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-0.5" />}
              </button>

              <button
                onClick={() => setOpen(false)}
                className="text-[16px] leading-none transition-colors px-0.5"
                style={{ color: text3 }}
              >›</button>
            </div>

            {/* Config drawer */}
            {showConfig && (
              <div
                className="shrink-0 px-4 py-4 space-y-4 animate-fade-in overflow-y-auto"
                style={{ borderBottom: border, background: 'rgb(var(--c-surface))', maxHeight: '400px' }}
              >
                {/* AI Key */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-[11px] font-semibold" style={{ color: text1 }}>Anthropic Key</p>
                    {hasKey && !editingKey && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                        style={{ background: 'rgb(63 185 80 / 0.1)', color: 'rgb(63 185 80)' }}>
                        ✓ configured
                      </span>
                    )}
                    {!hasKey && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                        style={{ background: 'rgb(240 160 48 / 0.12)', color: 'rgb(240 160 48)' }}>
                        required
                      </span>
                    )}
                    {keySuccess && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded animate-fade-in"
                        style={{ background: 'rgb(63 185 80 / 0.1)', color: 'rgb(63 185 80)' }}>
                        Saved!
                      </span>
                    )}
                  </div>

                  {!hasKey || editingKey ? (
                    <div className="space-y-2">
                      <p className="text-[10px] leading-relaxed" style={{ color: text3 }}>
                        Paste your Claude key (<span className="font-mono" style={{ color: coral }}>sk-ant-…</span>).
                        Stored encrypted, never shared.
                      </p>
                      <div className="relative">
                        <input
                          type={keyVisible ? 'text' : 'password'}
                          value={keyDraft}
                          onChange={(e) => { setKeyDraft(e.target.value); setKeyError('') }}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveKey() }}
                          placeholder="sk-ant-api03-…"
                          className="w-full text-[11px] px-2.5 py-2 pr-8 rounded-lg outline-none font-mono"
                          style={{
                            background: 'rgb(var(--c-overlay-sm))',
                            border: keyError ? '1px solid rgb(248 81 73 / 0.5)' : '1px solid rgb(var(--c-border-normal))',
                            color: text1,
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setKeyVisible((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] opacity-50 hover:opacity-100"
                        >
                          {keyVisible ? '🙈' : '👁'}
                        </button>
                      </div>
                      {keyError && <p className="text-[10px]" style={{ color: 'rgb(248 81 73)' }}>{keyError}</p>}
                      <div className="flex gap-2">
                        <button
                          onClick={saveKey}
                          disabled={!keyDraft.trim() || keySaving}
                          className="flex-1 text-[11px] py-1.5 rounded-lg font-semibold disabled:opacity-40"
                          style={{ background: 'rgb(217 119 87)', color: '#fff' }}
                        >
                          {keySaving ? 'Saving…' : 'Save key'}
                        </button>
                        {hasKey && (
                          <button
                            onClick={() => setEditingKey(false)}
                            className="text-[11px] px-3 py-1.5 rounded-lg"
                            style={{ background: 'rgb(var(--c-overlay-md))', color: text3 }}
                          >Cancel</button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 text-[11px] font-mono px-2.5 py-1.5 rounded-lg"
                        style={{ background: 'rgb(var(--c-overlay-sm))', border: '1px solid rgb(var(--c-border-subtle))', color: text3 }}>
                        sk-···················
                      </div>
                      <button onClick={() => setEditingKey(true)} className="text-[11px] px-2 py-1.5 rounded-lg"
                        style={{ background: 'rgb(var(--c-overlay-md))', color: text3, border: '1px solid rgb(var(--c-border-subtle))' }}>
                        Change
                      </button>
                      <button onClick={removeKey} className="text-[11px] px-2 py-1.5 rounded-lg"
                        style={{ background: 'rgb(248 81 73 / 0.08)', color: 'rgb(248 81 73)', border: '1px solid rgb(248 81 73 / 0.2)' }}>
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ borderTop: border }} />

                {/* Model */}
                <div>
                  <p className="text-[10px] font-semibold mb-2" style={{ color: text3 }}>Model</p>
                  <div className="grid grid-cols-1 gap-1">
                    {(Object.entries(MODEL_LABELS) as [AIConfig['model'], { label: string; hint: string }][]).map(([m, info]) => (
                      <button
                        key={m}
                        onClick={() => setConfig((c) => ({ ...c, model: m }))}
                        className="text-left px-2.5 py-2 rounded-lg flex items-center justify-between"
                        style={{
                          background: config.model === m ? 'rgb(217 119 87 / 0.10)' : 'rgb(var(--c-overlay-xs))',
                          border: config.model === m ? '1px solid rgb(217 119 87 / 0.3)' : '1px solid rgb(var(--c-border-subtle))',
                        }}
                      >
                        <span className="text-[11px] font-medium" style={{ color: config.model === m ? coral : text1 }}>
                          {info.label}
                        </span>
                        <span className="text-[10px]" style={{ color: text3 }}>{info.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Temperature */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <p className="text-[10px] font-semibold" style={{ color: text3 }}>Temperature</p>
                    <p className="text-[10px] font-mono" style={{ color: coral }}>{config.temperature.toFixed(1)}</p>
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.1"
                    value={config.temperature}
                    onChange={(e) => setConfig((c) => ({ ...c, temperature: parseFloat(e.target.value) }))}
                    className="w-full h-1 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: 'rgb(217 119 87)' }}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px]" style={{ color: text3 }}>Precise</span>
                    <span className="text-[9px]" style={{ color: text3 }}>Creative</span>
                  </div>
                </div>

                {/* System note */}
                <div>
                  <p className="text-[10px] font-semibold mb-1.5" style={{ color: text3 }}>Custom instruction</p>
                  <textarea
                    value={config.systemNote}
                    onChange={(e) => setConfig((c) => ({ ...c, systemNote: e.target.value }))}
                    placeholder="e.g. Always reply in Spanish…"
                    rows={2}
                    className="w-full text-[11px] px-2.5 py-2 rounded-lg resize-none outline-none"
                    style={{
                      background: 'rgb(var(--c-overlay-sm))',
                      border: '1px solid rgb(var(--c-border-subtle))',
                      color: text1,
                    }}
                  />
                </div>
              </div>
            )}

            {/* No-key banner */}
            {!hasKey && !showConfig && (
              <button
                onClick={() => setShowConfig(true)}
                className="shrink-0 flex items-center gap-2 px-4 py-2 text-[11px] w-full text-left"
                style={{ background: 'rgb(240 160 48 / 0.08)', borderBottom: '1px solid rgb(240 160 48 / 0.15)', color: 'rgb(240 160 48)' }}
              >
                <span>⚠</span>
                <span>Add your AI key to enable chat</span>
                <span className="ml-auto underline opacity-70">configure →</span>
              </button>
            )}

            {/* Conversation tab strip */}
            {convsLoaded && conversations.length > 0 && (
              <ConversationTabStrip
                conversations={conversations}
                activeId={activeConversationId}
                onSelect={(id) => { setActiveConversationId(id); setShowHistory(false) }}
                onNew={createConversation}
                onDelete={deleteConversation}
              />
            )}

            {/* Chat window — key resets on conversation switch */}
            <div className="flex-1 overflow-hidden">
              <ChatWindow
                key={activeConversationId}
                {...props}
                aiConfig={config}
                conversationId={activeConversationId}
                onTitleGenerated={handleTitleGenerated}
                initialMessages={[]}
              />
            </div>
          </div>

          {/* Overlay panels */}
          {showHistory && (
            <ConversationHistoryDrawer
              conversations={conversations}
              activeId={activeConversationId}
              onSelect={(id) => { setActiveConversationId(id); setShowHistory(false) }}
              onRename={renameConversation}
              onDelete={deleteConversation}
              onClose={() => setShowHistory(false)}
            />
          )}

          {showMemory && (
            <MemoryPanel
              leagueId={leagueId}
              onClose={() => setShowMemory(false)}
            />
          )}
        </div>
      )}
    </>
  )
}
