'use client'

import { useState, useRef, useEffect } from 'react'
import type { Skill } from './SkillModal'
import type { MCPConfig } from './MCPServerModal'

interface ToolCallBlock {
  id: string
  tool: string
  result?: string
  open: boolean
}

interface SandboxMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
  toolCalls?: ToolCallBlock[]
}

interface Props {
  leagueId: string
}

export function SandboxPanel({ leagueId }: Props) {
  const [skills, setSkills] = useState<Skill[]>([])
  const [mcpConfigs, setMcpConfigs] = useState<MCPConfig[]>([])
  const [activeSkillIds, setActiveSkillIds] = useState<Set<string>>(new Set())
  const [activeMcpIds, setActiveMcpIds] = useState<Set<string>>(new Set())
  const [loadingConfig, setLoadingConfig] = useState(true)

  const [messages, setMessages] = useState<SandboxMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [systemPromptPreview, setSystemPromptPreview] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const border = '1px solid rgb(var(--c-border-subtle))'

  useEffect(() => {
    Promise.all([
      fetch('/api/skills').then((r) => r.json()),
      fetch('/api/mcp-configs').then((r) => r.json()),
    ]).then(([skillsData, mcpData]) => {
      const sk: Skill[] = skillsData.ok ? skillsData.data : []
      const mc: MCPConfig[] = mcpData.ok ? mcpData.data : []
      setSkills(sk)
      setMcpConfigs(mc)
      // Default: enable whatever is enabled in production
      setActiveSkillIds(new Set(sk.filter((s) => s.enabled).map((s) => s._id)))
      setActiveMcpIds(new Set(mc.filter((c) => c.enabled).map((c) => c._id)))
      setLoadingConfig(false)
    }).catch(() => setLoadingConfig(false))
  }, [])

  // Build system prompt preview whenever active selections change
  useEffect(() => {
    const enabledSkills = skills.filter((s) => activeSkillIds.has(s._id))
    const instructionSkills = enabledSkills.filter((s) => s.type === 'instruction')
    const toolSkills = enabledSkills.filter((s) => s.type === 'tool')
    const enabledMcps = mcpConfigs.filter((m) => activeMcpIds.has(m._id))

    let preview = `## Context\n- user_id: (you)\n- league_id: ${leagueId || '(none)'}\n\n`

    if (instructionSkills.length > 0) {
      preview += `## Custom Instructions\n${instructionSkills.map((s) => `- ${s.prompt.slice(0, 80)}…`).join('\n')}\n\n`
    }

    if (toolSkills.length > 0) {
      preview += `## Skill Tools\n${toolSkills.map((s) => `- ${s.name}: ${s.description || s.prompt.slice(0, 60)}`).join('\n')}\n\n`
    }

    if (enabledMcps.length > 0) {
      preview += `## MCP Servers\n${enabledMcps.map((m) => `- ${m.name} (${m.toolCount} tools)`).join('\n')}`
    }

    setSystemPromptPreview(preview.trim())
  }, [activeSkillIds, activeMcpIds, skills, mcpConfigs, leagueId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || isLoading) return
    const text = input.trim()
    setInput('')

    const userMsg: SandboxMessage = { id: crypto.randomUUID(), role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    const assistantId = crypto.randomUUID()
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', streaming: true, toolCalls: [] },
    ])

    const agentConfig = {
      skills: skills.filter((s) => activeSkillIds.has(s._id)),
      mcp_configs: mcpConfigs.filter((m) => activeMcpIds.has(m._id)),
      memories: [],
    }

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/agent/sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, leagueId, agentConfig }),
        signal: abortRef.current.signal,
      })

      if (!res.body) throw new Error('No body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let activeToolId: string | null = null

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
              setMessages((prev) => prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + event.content, streaming: true }
                  : m
              ))
            } else if (event.type === 'tool_start') {
              const toolCallId = crypto.randomUUID()
              activeToolId = toolCallId
              setMessages((prev) => prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      toolCalls: [...(m.toolCalls ?? []), { id: toolCallId, tool: event.tool, open: true }],
                    }
                  : m
              ))
            } else if (event.type === 'tool_result' && activeToolId) {
              const tid = activeToolId
              activeToolId = null
              setMessages((prev) => prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      toolCalls: (m.toolCalls ?? []).map((tc) =>
                        tc.id === tid ? { ...tc, result: event.result } : tc
                      ),
                    }
                  : m
              ))
            } else if (event.type === 'done') {
              setMessages((prev) => prev.map((m) =>
                m.id === assistantId ? { ...m, streaming: false } : m
              ))
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages((prev) => prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'Error: ' + err.message, streaming: false }
            : m
        ))
      }
    } finally {
      setIsLoading(false)
      setMessages((prev) => prev.map((m) =>
        m.id === assistantId ? { ...m, streaming: false } : m
      ))
    }
  }

  function toggleToolBlock(msgId: string, toolId: string) {
    setMessages((prev) => prev.map((m) =>
      m.id === msgId
        ? {
            ...m,
            toolCalls: (m.toolCalls ?? []).map((tc) =>
              tc.id === toolId ? { ...tc, open: !tc.open } : tc
            ),
          }
        : m
    ))
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left pane — config preview */}
      <div
        className="shrink-0 flex flex-col overflow-hidden"
        style={{ width: '300px', borderRight: border }}
      >
        <div className="shrink-0 px-4 py-3" style={{ borderBottom: border }}>
          <p className="text-[12px] font-semibold" style={{ color: 'rgb(var(--c-text-1))' }}>Config preview</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'rgb(var(--c-text-3))' }}>
            Active skills + MCP servers
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loadingConfig ? (
            <p className="text-[11px]" style={{ color: 'rgb(var(--c-text-3))' }}>Loading…</p>
          ) : (
            <>
              {/* Skills chips */}
              {skills.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold mb-2" style={{ color: 'rgb(var(--c-text-3))' }}>
                    ⚡ Skills
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((s) => {
                      const active = activeSkillIds.has(s._id)
                      return (
                        <button
                          key={s._id}
                          onClick={() => {
                            setActiveSkillIds((prev) => {
                              const next = new Set(prev)
                              active ? next.delete(s._id) : next.add(s._id)
                              return next
                            })
                          }}
                          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full transition-all"
                          style={{
                            background: active ? 'rgb(217 119 87 / 0.12)' : 'rgb(var(--c-overlay-sm))',
                            border: active ? '1px solid rgb(217 119 87 / 0.35)' : '1px solid transparent',
                            color: active ? 'rgb(217 119 87)' : 'rgb(var(--c-text-3))',
                          }}
                        >
                          <span>{s.icon}</span>
                          <span>{s.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* MCP servers */}
              {mcpConfigs.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold mb-2" style={{ color: 'rgb(var(--c-text-3))' }}>
                    ⊕ MCP Servers
                  </p>
                  <div className="space-y-1">
                    {mcpConfigs.map((mc) => {
                      const active = activeMcpIds.has(mc._id)
                      return (
                        <button
                          key={mc._id}
                          onClick={() => {
                            setActiveMcpIds((prev) => {
                              const next = new Set(prev)
                              active ? next.delete(mc._id) : next.add(mc._id)
                              return next
                            })
                          }}
                          className="flex items-center gap-2 w-full text-left text-[10px] px-2.5 py-1.5 rounded-lg transition-all"
                          style={{
                            background: active ? 'rgb(63 185 80 / 0.08)' : 'rgb(var(--c-overlay-sm))',
                            border: active ? '1px solid rgb(63 185 80 / 0.25)' : '1px solid transparent',
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: active ? 'rgb(63 185 80)' : 'rgb(var(--c-border-normal))' }}
                          />
                          <span style={{ color: active ? 'rgb(63 185 80)' : 'rgb(var(--c-text-3))' }}>
                            {mc.name}
                          </span>
                          {mc.toolCount > 0 && (
                            <span className="ml-auto text-[9px]" style={{ color: 'rgb(var(--c-text-3))' }}>
                              {mc.toolCount}t
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* System prompt preview */}
              <div>
                <p className="text-[10px] font-semibold mb-2" style={{ color: 'rgb(var(--c-text-3))' }}>
                  System prompt preview
                </p>
                <pre
                  className="text-[9px] leading-relaxed rounded-lg p-2.5 overflow-auto whitespace-pre-wrap font-mono"
                  style={{
                    background: 'rgb(var(--c-overlay-xs))',
                    border,
                    color: 'rgb(var(--c-text-3))',
                    maxHeight: '300px',
                  }}
                >
                  {systemPromptPreview || '(empty)'}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right pane — test chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 flex items-center justify-between px-4 py-3" style={{ borderBottom: border }}>
          <div>
            <p className="text-[12px] font-semibold" style={{ color: 'rgb(var(--c-text-1))' }}>Sandbox chat</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgb(var(--c-text-3))' }}>
              Test with your active config
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="text-[10px] px-2 py-1 rounded-lg"
              style={{ background: 'rgb(var(--c-overlay-md))', color: 'rgb(var(--c-text-3))' }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <span className="text-3xl">⧉</span>
              <p className="text-[12px] font-medium" style={{ color: 'rgb(var(--c-text-2))' }}>
                Sandbox ready
              </p>
              <p className="text-[11px] max-w-[240px]" style={{ color: 'rgb(var(--c-text-3))' }}>
                Toggle skills and MCP servers on the left, then test how the agent responds.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id}>
              <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[85%] rounded-xl px-3 py-2 text-[12px]"
                  style={{
                    background: msg.role === 'user'
                      ? 'rgb(217 119 87 / 0.12)'
                      : 'rgb(var(--c-overlay-xs))',
                    border,
                    color: 'rgb(var(--c-text-1))',
                  }}
                >
                  {msg.content || (msg.streaming ? '…' : '')}
                  {msg.streaming && <span className="inline-block w-1 h-3 ml-0.5 animate-pulse bg-current" />}
                </div>
              </div>

              {/* Tool call blocks */}
              {(msg.toolCalls ?? []).map((tc) => (
                <div key={tc.id} className="mt-1.5 ml-0">
                  <button
                    onClick={() => toggleToolBlock(msg.id, tc.id)}
                    className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg transition-all w-full text-left"
                    style={{
                      background: tc.result ? 'rgb(63 185 80 / 0.06)' : 'rgb(240 160 48 / 0.06)',
                      border: tc.result ? '1px solid rgb(63 185 80 / 0.2)' : '1px solid rgb(240 160 48 / 0.2)',
                    }}
                  >
                    <span style={{ color: tc.result ? 'rgb(63 185 80)' : 'rgb(240 160 48)' }}>
                      {tc.result ? '✓' : '⟳'}
                    </span>
                    <span className="font-mono font-medium flex-1" style={{ color: 'rgb(var(--c-text-2))' }}>
                      {tc.tool}
                    </span>
                    <span style={{ color: 'rgb(var(--c-text-3))' }}>{tc.open ? '▲' : '▼'}</span>
                  </button>
                  {tc.open && tc.result && (
                    <pre
                      className="text-[9px] font-mono mt-1 px-2.5 py-2 rounded-lg overflow-auto"
                      style={{
                        background: 'rgb(var(--c-overlay-xs))',
                        border,
                        color: 'rgb(var(--c-text-3))',
                        maxHeight: '120px',
                      }}
                    >
                      {tc.result}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 px-4 pb-4 pt-2" style={{ borderTop: border }}>
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
              }}
              placeholder="Test your agent…"
              rows={2}
              className="flex-1 text-[12px] px-3 py-2 rounded-xl resize-none outline-none"
              style={{
                background: 'rgb(var(--c-overlay-sm))',
                border,
                color: 'rgb(var(--c-text-1))',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center font-bold disabled:opacity-40 transition-all"
              style={{ background: 'rgb(217 119 87)', color: '#fff' }}
            >
              ↑
            </button>
          </div>
          <p className="text-[9px] mt-1.5" style={{ color: 'rgb(var(--c-text-3))' }}>
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}
