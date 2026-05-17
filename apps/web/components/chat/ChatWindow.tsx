'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { TypingIndicator } from './TypingIndicator'
import type { Mention } from '@/lib/mention-types'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

interface AIConfig {
  model: string
  temperature: number
  systemNote: string
}

interface Props {
  leagueId: string
  leagueName: string
  userName: string
  userRank: number
  userPoints: number
  initialMessages?: Message[]
  aiConfig?: AIConfig
  conversationId?: string
  onTitleGenerated?: (conversationId: string, title: string) => void
}

export function ChatWindow({
  leagueId,
  leagueName,
  userName,
  userRank,
  userPoints,
  initialMessages = [],
  aiConfig,
  conversationId = '',
  onTitleGenerated,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const [toolActivity, setToolActivity] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const isFirstExchange = useRef(messages.length === 0)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, toolActivity])

  // Reset when conversation switches
  useEffect(() => {
    setMessages(initialMessages)
    isFirstExchange.current = initialMessages.length === 0
  }, [conversationId])

  const sendMessage = useCallback(async (text: string, mentions: Mention[] = []) => {
    if (!text.trim() && mentions.length === 0) return
    if (isLoading) return

    const displayText = mentions.length > 0 && !text.trim()
      ? `Tell me about ${mentions.map((m) => m.label).join(' and ')}`
      : text

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: displayText }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)
    setToolActivity(null)

    const assistantId = crypto.randomUUID()
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', streaming: true },
    ])

    abortRef.current = new AbortController()

    let finalResponse = ''

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: displayText,
          leagueId,
          conversationId,
          mentions,
          aiConfig,
        }),
        signal: abortRef.current.signal,
      })

      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'token') {
              finalResponse += event.content
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + event.content, streaming: true }
                    : m
                )
              )
              setToolActivity(null)
            } else if (event.type === 'tool_start') {
              setToolActivity(formatToolName(event.tool))
            } else if (event.type === 'tool_end' || event.type === 'tool_result') {
              setToolActivity(null)
            } else if (event.type === 'done') {
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
              )
              setToolActivity(null)
            } else if (event.type === 'error') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: event.content, streaming: false }
                    : m
                )
              )
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: 'Something went wrong. Please try again.', streaming: false }
              : m
          )
        )
      }
    } finally {
      setIsLoading(false)
      setToolActivity(null)
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
      )

      // Auto-title on first exchange
      if (isFirstExchange.current && conversationId && finalResponse && onTitleGenerated) {
        isFirstExchange.current = false
        fetch(`/api/chat/conversations/${conversationId}/auto-title`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstMessage: displayText.slice(0, 300), firstResponse: finalResponse.slice(0, 300) }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.ok && data.title) {
              onTitleGenerated(conversationId, data.title)
            }
          })
          .catch(() => {})
      }
    }
  }, [isLoading, leagueId, conversationId, aiConfig])

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {messages.length === 0 && (
          <WelcomeMessage
            userName={userName}
            leagueName={leagueName}
            userRank={userRank}
            userPoints={userPoints}
          />
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} streaming={m.streaming} />
        ))}

        {toolActivity && <TypingIndicator label={toolActivity} />}
        {isLoading && !toolActivity && messages[messages.length - 1]?.content === '' && (
          <TypingIndicator label="Thinking…" />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-3 pb-4 pt-2" style={{ borderTop: '1px solid rgb(var(--c-border-subtle))' }}>
        <ChatInput onSend={(msg, mentions) => sendMessage(msg, mentions)} disabled={isLoading} leagueId={leagueId} />
      </div>
    </div>
  )
}

function WelcomeMessage({ userName, leagueName, userRank, userPoints }: {
  userName: string
  leagueName: string
  userRank: number
  userPoints: number
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center animate-fade-in">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-glow-coral"
        style={{ background: 'linear-gradient(135deg, #d97757, #c8664a)', color: 'rgb(var(--c-bg))' }}
      >
        B
      </div>
      <div className="space-y-1 max-w-[260px]">
        <p className="text-[13px] font-semibold" style={{ color: 'rgb(var(--c-text-1))' }}>
          Hey {userName.split(' ')[0]}! 👋
        </p>
        <p className="text-[12px] leading-relaxed" style={{ color: 'rgb(var(--c-text-3))' }}>
          I'm Polo. I'm in <span style={{ color: 'rgb(217 119 87)' }}>{leagueName}</span> too.
          {userRank > 0
            ? ` You're #${userRank} with ${userPoints} pts.`
            : ' Let\'s go win this.'}
        </p>
      </div>
      <p className="text-[11px]" style={{ color: 'rgb(var(--c-surface-3))' }}>
        Drop any player or match card here to add context ↓
      </p>
    </div>
  )
}

function formatToolName(tool: string): string {
  const map: Record<string, string> = {
    get_league_table:     'Checking standings…',
    get_league_members:   'Looking up members…',
    get_league_stats:     'Fetching league stats…',
    get_league_trends:    'Analysing trends…',
    get_upcoming_matches: 'Checking fixtures…',
    get_match_stats:      'Getting match stats…',
    get_all_matches:      'Loading fixtures…',
    get_user_predictions: 'Loading predictions…',
    submit_prediction:    'Submitting…',
    search_web:           'Searching the web…',
    get_league_context:   'Reading league rules…',
    save_memory:          'Remembering…',
  }
  return map[tool] ?? 'Working…'
}
