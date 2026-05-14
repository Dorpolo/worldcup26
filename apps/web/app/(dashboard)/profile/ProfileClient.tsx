'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface Props {
  name: string
  email: string
  apiKey: string
  aiApiKey: string
  mcpUrl: string
}

export function ProfileClient({ name, email, apiKey, aiApiKey, mcpUrl }: Props) {
  const [showKey, setShowKey] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedConfig, setCopiedConfig] = useState(false)
  const [aiKey, setAiKey] = useState(aiApiKey)
  const [showAiKey, setShowAiKey] = useState(false)
  const [savingAiKey, setSavingAiKey] = useState(false)

  async function saveAiKey() {
    setSavingAiKey(true)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiApiKey: aiKey }),
      })
      if (res.ok) {
        toast.success('API key saved')
      } else {
        toast.error('Failed to save')
      }
    } finally {
      setSavingAiKey(false)
    }
  }

  const maskedKey = apiKey.slice(0, 8) + '•'.repeat(apiKey.length - 8)

  async function copyKey() {
    await navigator.clipboard.writeText(apiKey)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
    toast.success('API key copied')
  }

  const mcpConfig = JSON.stringify({
    mcpServers: {
      worldcup26: {
        url: `${mcpUrl}/mcp`,
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    },
  }, null, 2)

  async function copyConfig() {
    await navigator.clipboard.writeText(mcpConfig)
    setCopiedConfig(true)
    setTimeout(() => setCopiedConfig(false), 2000)
    toast.success('Config copied')
  }

  const cardStyle = {
    background: 'rgb(36 34 32)',
    border: '1px solid rgb(255 255 255 / 0.07)',
    borderRadius: '16px',
    padding: '20px',
  }

  const labelStyle = {
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: 'rgb(107 100 92)',
  }

  return (
    <div className="space-y-4">
      {/* Account info */}
      <section style={cardStyle}>
        <p className="text-[13px] font-semibold mb-4" style={{ color: 'rgb(240 235 227)' }}>Account</p>
        <div className="space-y-3">
          <div>
            <p style={labelStyle}>Name</p>
            <p className="text-[13px] mt-1" style={{ color: 'rgb(240 235 227)' }}>{name}</p>
          </div>
          <div>
            <p style={labelStyle}>Email</p>
            <p className="text-[13px] mt-1" style={{ color: 'rgb(160 152 144)' }}>{email}</p>
          </div>
        </div>
      </section>

      {/* API Key */}
      <section style={cardStyle}>
        <div className="space-y-3">
          <div>
            <p className="text-[13px] font-semibold mb-0.5" style={{ color: 'rgb(240 235 227)' }}>API Key</p>
            <p className="text-[11px]" style={{ color: 'rgb(107 100 92)' }}>
              Use this key to connect external MCP clients (Claude Code, Claude Desktop) to your league data.
            </p>
          </div>

          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: 'rgb(255 255 255 / 0.04)', border: '1px solid rgb(255 255 255 / 0.08)' }}
          >
            <code className="flex-1 text-[11px] font-mono truncate" style={{ color: 'rgb(217 119 87)' }}>
              {showKey ? apiKey : maskedKey}
            </code>
            <button
              onClick={() => setShowKey((v) => !v)}
              className="text-[10px] shrink-0"
              style={{ color: 'rgb(107 100 92)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
            <button
              onClick={copyKey}
              className="text-[11px] px-2.5 py-1 rounded-lg shrink-0 transition-all"
              style={copiedKey
                ? { background: 'rgb(63 185 80 / 0.12)', color: 'rgb(63 185 80)', border: 'none', cursor: 'pointer' }
                : { background: 'rgb(255 255 255 / 0.07)', color: 'rgb(160 152 144)', border: 'none', cursor: 'pointer' }
              }
            >
              {copiedKey ? '✓' : 'Copy'}
            </button>
          </div>
        </div>
      </section>

      {/* AI API Key */}
      <section style={cardStyle}>
        <div className="space-y-3">
          <div>
            <p className="text-[13px] font-semibold mb-0.5" style={{ color: 'rgb(240 235 227)' }}>Chat API Key</p>
            <p className="text-[11px]" style={{ color: 'rgb(107 100 92)' }}>
              Optionally provide your own Claude or OpenAI API key. The AI chat will use it instead of the shared key — useful for higher rate limits.
            </p>
          </div>

          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: 'rgb(255 255 255 / 0.04)', border: '1px solid rgb(255 255 255 / 0.08)' }}
          >
            <input
              type={showAiKey ? 'text' : 'password'}
              value={aiKey}
              onChange={(e) => setAiKey(e.target.value)}
              placeholder="sk-ant-... or sk-..."
              className="flex-1 text-[11px] font-mono bg-transparent outline-none"
              style={{ color: 'rgb(217 119 87)' }}
            />
            <button
              onClick={() => setShowAiKey((v) => !v)}
              className="text-[10px] shrink-0"
              style={{ color: 'rgb(107 100 92)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {showAiKey ? 'Hide' : 'Show'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[10px]" style={{ color: 'rgb(58 55 51)' }}>
              Supports keys starting with <code style={{ color: 'rgb(107 100 92)' }}>sk-ant-</code> (Claude) or <code style={{ color: 'rgb(107 100 92)' }}>sk-</code> (OpenAI)
            </p>
            <button
              onClick={saveAiKey}
              disabled={savingAiKey}
              className="text-[11px] px-3 py-1.5 rounded-lg transition-all shrink-0"
              style={{
                background: savingAiKey ? 'rgb(255 255 255 / 0.05)' : 'rgb(217 119 87 / 0.12)',
                color: savingAiKey ? 'rgb(107 100 92)' : 'rgb(217 119 87)',
                border: 'none',
                cursor: savingAiKey ? 'not-allowed' : 'pointer',
              }}
            >
              {savingAiKey ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </section>

      {/* MCP Config */}
      <section style={cardStyle}>
        <div className="space-y-3">
          <div>
            <p className="text-[13px] font-semibold mb-0.5" style={{ color: 'rgb(240 235 227)' }}>MCP Config</p>
            <p className="text-[11px]" style={{ color: 'rgb(107 100 92)' }}>
              Add this to your <code style={{ color: 'rgb(160 152 144)' }}>claude_desktop_config.json</code> or Claude Code settings to connect the AI to your league.
            </p>
          </div>

          <div className="relative">
            <pre
              className="text-[11px] font-mono p-4 rounded-xl overflow-x-auto leading-relaxed"
              style={{ background: 'rgb(20 19 17)', color: 'rgb(160 152 144)', border: '1px solid rgb(255 255 255 / 0.06)' }}
            >
              {mcpConfig}
            </pre>
            <button
              onClick={copyConfig}
              className="absolute top-3 right-3 text-[10px] px-2.5 py-1 rounded-lg transition-all"
              style={copiedConfig
                ? { background: 'rgb(63 185 80 / 0.15)', color: 'rgb(63 185 80)', border: 'none', cursor: 'pointer' }
                : { background: 'rgb(255 255 255 / 0.08)', color: 'rgb(107 100 92)', border: 'none', cursor: 'pointer' }
              }
            >
              {copiedConfig ? '✓ Copied' : 'Copy'}
            </button>
          </div>

          <div className="space-y-1 pt-1">
            {[
              ['Claude Code', 'claude mcp add worldcup26 --transport http --url ' + mcpUrl + '/mcp --header "Authorization: Bearer <your-key>"'],
              ['Claude Desktop', 'Paste the JSON above into your claude_desktop_config.json under "mcpServers"'],
            ].map(([client, instruction]) => (
              <div key={client} className="flex gap-2">
                <span className="text-[10px] font-semibold shrink-0 w-24" style={{ color: 'rgb(107 100 92)' }}>{client}</span>
                <span className="text-[10px]" style={{ color: 'rgb(58 55 51)' }}>{instruction}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
