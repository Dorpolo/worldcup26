'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'

interface Props {
  name: string
  email: string
  apiKey: string
  aiApiKey: string
  mcpUrl: string
  avatar?: string
}

const AVATAR_STYLES = ['adventurer', 'bottts', 'fun-emoji', 'pixel-art', 'lorelei', 'micah']

export function ProfileClient({ name, email, apiKey, aiApiKey, mcpUrl, avatar: initialAvatar }: Props) {
  const [showKey, setShowKey] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedConfig, setCopiedConfig] = useState(false)
  const [aiKey, setAiKey] = useState(aiApiKey)
  const [showAiKey, setShowAiKey] = useState(false)
  const [savingAiKey, setSavingAiKey] = useState(false)
  const [avatar, setAvatar] = useState(initialAvatar ?? '')
  const [uploading, setUploading] = useState(false)
  const [avatarStyle, setAvatarStyle] = useState(AVATAR_STYLES[0])
  const fileRef = useRef<HTMLInputElement>(null)

  async function saveAiKey() {
    setSavingAiKey(true)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiApiKey: aiKey }),
      })
      if (res.ok) toast.success('API key saved')
      else toast.error('Failed to save')
    } finally {
      setSavingAiKey(false)
    }
  }

  async function uploadAvatar(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/users/me/avatar', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.ok) { setAvatar(json.avatar); toast.success('Avatar updated') }
      else toast.error(json.error ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function generateAvatar() {
    const seed = encodeURIComponent(name + Date.now())
    const url = `https://api.dicebear.com/8.x/${avatarStyle}/png?seed=${seed}&size=200`
    setUploading(true)
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const file = new File([blob], 'avatar.png', { type: 'image/png' })
      await uploadAvatar(file)
    } catch {
      toast.error('Generation failed')
      setUploading(false)
    }
  }

  const maskedKey = apiKey.slice(0, 8) + '•'.repeat(Math.max(0, apiKey.length - 8))

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
        headers: { Authorization: `Bearer ${apiKey}` },
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
    background: 'rgb(var(--c-surface))',
    border: '1px solid rgb(var(--c-border-subtle))',
    borderRadius: '16px',
    padding: '20px',
  }

  const labelStyle = {
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: 'rgb(var(--c-text-3))',
  }

  return (
    <div className="space-y-4">
      {/* Avatar + Account */}
      <section style={cardStyle}>
        <p className="text-[13px] font-semibold mb-4" style={{ color: 'rgb(var(--c-text-1))' }}>Account</p>
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="shrink-0 relative">
            <div
              className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center text-2xl font-bold cursor-pointer select-none"
              style={{ background: 'rgb(217 119 87 / 0.15)', color: 'rgb(217 119 87)' }}
              onClick={() => fileRef.current?.click()}
              title="Click to upload photo"
            >
              {avatar
                ? <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                : name?.[0]?.toUpperCase()
              }
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl"
                  style={{ background: 'rgb(0 0 0 / 0.5)' }}>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] pointer-events-none"
              style={{ background: 'rgb(217 119 87)', color: '#fff' }}>
              ✎
            </div>
          </div>

          {/* Info + upload controls */}
          <div className="flex-1 space-y-2 min-w-0">
            <div>
              <p style={labelStyle}>Name</p>
              <p className="text-[13px] mt-0.5" style={{ color: 'rgb(var(--c-text-1))' }}>{name}</p>
            </div>
            <div>
              <p style={labelStyle}>Email</p>
              <p className="text-[13px] mt-0.5" style={{ color: 'rgb(var(--c-text-2))' }}>{email}</p>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f) }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="text-[11px] px-2.5 py-1 rounded-lg transition-all disabled:opacity-40"
                style={{ background: 'rgb(var(--c-border-subtle))', color: 'rgb(var(--c-text-2))', border: 'none', cursor: 'pointer' }}
              >
                ↑ Upload photo
              </button>
              <select
                value={avatarStyle}
                onChange={(e) => setAvatarStyle(e.target.value)}
                className="text-[11px] px-2 py-1 rounded-lg outline-none"
                style={{ background: 'rgb(var(--c-border-subtle))', color: 'rgb(var(--c-text-2))', border: 'none', cursor: 'pointer' }}
              >
                {AVATAR_STYLES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                onClick={generateAvatar}
                disabled={uploading}
                className="text-[11px] px-2.5 py-1 rounded-lg transition-all disabled:opacity-40"
                style={{ background: 'rgb(217 119 87 / 0.12)', color: 'rgb(217 119 87)', border: 'none', cursor: 'pointer' }}
              >
                ✨ Generate avatar
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* API Key */}
      <section style={cardStyle}>
        <div className="space-y-3">
          <div>
            <p className="text-[13px] font-semibold mb-0.5" style={{ color: 'rgb(var(--c-text-1))' }}>API Key</p>
            <p className="text-[11px]" style={{ color: 'rgb(var(--c-text-3))' }}>
              Connect external MCP clients (Claude Code, Claude Desktop) to your league data.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: 'rgb(var(--c-overlay-sm))', border: '1px solid rgb(var(--c-border-normal))' }}>
            <code className="flex-1 text-[11px] font-mono truncate" style={{ color: 'rgb(217 119 87)' }}>
              {showKey ? apiKey : maskedKey}
            </code>
            <button onClick={() => setShowKey((v) => !v)} className="text-[10px] shrink-0"
              style={{ color: 'rgb(var(--c-text-3))', background: 'none', border: 'none', cursor: 'pointer' }}>
              {showKey ? 'Hide' : 'Show'}
            </button>
            <button onClick={copyKey} className="text-[11px] px-2.5 py-1 rounded-lg shrink-0 transition-all"
              style={copiedKey
                ? { background: 'rgb(63 185 80 / 0.12)', color: 'rgb(63 185 80)', border: 'none', cursor: 'pointer' }
                : { background: 'rgb(var(--c-border-subtle))', color: 'rgb(var(--c-text-2))', border: 'none', cursor: 'pointer' }}>
              {copiedKey ? '✓' : 'Copy'}
            </button>
          </div>
        </div>
      </section>

      {/* Chat API Key */}
      <section style={cardStyle}>
        <div className="space-y-3">
          <div>
            <p className="text-[13px] font-semibold mb-0.5" style={{ color: 'rgb(var(--c-text-1))' }}>Chat API Key</p>
            <p className="text-[11px]" style={{ color: 'rgb(var(--c-text-3))' }}>
              Your own Claude or OpenAI key — use for higher rate limits.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: 'rgb(var(--c-overlay-sm))', border: '1px solid rgb(var(--c-border-normal))' }}>
            <input
              type={showAiKey ? 'text' : 'password'}
              value={aiKey}
              onChange={(e) => setAiKey(e.target.value)}
              placeholder="sk-ant-... or sk-..."
              className="flex-1 text-[11px] font-mono bg-transparent outline-none"
              style={{ color: 'rgb(217 119 87)' }}
            />
            <button onClick={() => setShowAiKey((v) => !v)} className="text-[10px] shrink-0"
              style={{ color: 'rgb(var(--c-text-3))', background: 'none', border: 'none', cursor: 'pointer' }}>
              {showAiKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[10px]" style={{ color: 'rgb(var(--c-surface-3))' }}>
              Supports <code style={{ color: 'rgb(var(--c-text-3))' }}>sk-ant-</code> (Claude) or <code style={{ color: 'rgb(var(--c-text-3))' }}>sk-</code> (OpenAI)
            </p>
            <button onClick={saveAiKey} disabled={savingAiKey} className="text-[11px] px-3 py-1.5 rounded-lg transition-all shrink-0"
              style={{
                background: savingAiKey ? 'rgb(var(--c-overlay-md))' : 'rgb(217 119 87 / 0.12)',
                color: savingAiKey ? 'rgb(var(--c-text-3))' : 'rgb(217 119 87)',
                border: 'none',
                cursor: savingAiKey ? 'not-allowed' : 'pointer',
              }}>
              {savingAiKey ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </section>

      {/* MCP Config */}
      <section style={cardStyle}>
        <div className="space-y-3">
          <div>
            <p className="text-[13px] font-semibold mb-0.5" style={{ color: 'rgb(var(--c-text-1))' }}>MCP Config</p>
            <p className="text-[11px]" style={{ color: 'rgb(var(--c-text-3))' }}>
              Add to <code style={{ color: 'rgb(var(--c-text-2))' }}>claude_desktop_config.json</code> or Claude Code settings.
            </p>
          </div>
          <div className="relative">
            <pre className="text-[11px] font-mono p-4 rounded-xl overflow-x-auto leading-relaxed"
              style={{ background: 'rgb(var(--c-bg-deep))', color: 'rgb(var(--c-text-2))', border: '1px solid rgb(var(--c-border-soft))' }}>
              {mcpConfig}
            </pre>
            <button onClick={copyConfig} className="absolute top-3 right-3 text-[10px] px-2.5 py-1 rounded-lg transition-all"
              style={copiedConfig
                ? { background: 'rgb(63 185 80 / 0.15)', color: 'rgb(63 185 80)', border: 'none', cursor: 'pointer' }
                : { background: 'rgb(var(--c-border-normal))', color: 'rgb(var(--c-text-3))', border: 'none', cursor: 'pointer' }}>
              {copiedConfig ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
