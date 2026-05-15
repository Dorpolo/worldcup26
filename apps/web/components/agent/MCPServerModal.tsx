'use client'

import { useState } from 'react'

export interface MCPConfig {
  _id: string
  name: string
  url: string
  headers: { key: string; value: string }[]
  description: string
  enabled: boolean
  toolCount: number
  lastTestedAt: string | null
}

interface Props {
  config?: MCPConfig
  onSave: (data: Omit<MCPConfig, '_id' | 'toolCount' | 'lastTestedAt'>) => Promise<void>
  onClose: () => void
}

export function MCPServerModal({ config, onSave, onClose }: Props) {
  const [name, setName] = useState(config?.name ?? '')
  const [url, setUrl] = useState(config?.url ?? '')
  const [description, setDescription] = useState(config?.description ?? '')
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>(
    config?.headers?.length ? config.headers : [{ key: '', value: '' }]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const border = '1px solid rgb(var(--c-border-subtle))'

  function addHeader() {
    setHeaders((prev) => [...prev, { key: '', value: '' }])
  }

  function updateHeader(i: number, field: 'key' | 'value', val: string) {
    setHeaders((prev) => prev.map((h, idx) => idx === i ? { ...h, [field]: val } : h))
  }

  function removeHeader(i: number) {
    setHeaders((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    if (!name.trim() || !url.trim()) {
      setError('Name and URL are required.')
      return
    }
    try { new URL(url) } catch { setError('Invalid URL.'); return }
    setSaving(true)
    setError('')
    try {
      await onSave({
        name: name.trim(),
        url: url.trim(),
        description: description.trim(),
        headers: headers.filter((h) => h.key.trim()),
        enabled: config?.enabled ?? true,
      })
      onClose()
    } catch {
      setError('Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgb(0 0 0 / 0.5)' }}>
      <div
        className="w-full max-w-lg rounded-xl overflow-hidden flex flex-col animate-fade-in"
        style={{ background: 'rgb(var(--c-surface))', border, maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-5 py-4" style={{ borderBottom: border }}>
          <span className="text-xl">⊕</span>
          <h2 className="flex-1 text-[14px] font-semibold" style={{ color: 'rgb(var(--c-text-1))' }}>
            {config ? 'Edit MCP server' : 'Add MCP server'}
          </h2>
          <button onClick={onClose} className="text-[18px] opacity-50 hover:opacity-100" style={{ color: 'rgb(var(--c-text-3))' }}>×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="block text-[10px] font-semibold mb-1.5" style={{ color: 'rgb(var(--c-text-3))' }}>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Football Data MCP"
              className="w-full text-[12px] px-3 py-2 rounded-lg outline-none"
              style={{ background: 'rgb(var(--c-overlay-sm))', border: '1px solid rgb(var(--c-border-normal))', color: 'rgb(var(--c-text-1))' }}
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold mb-1.5" style={{ color: 'rgb(var(--c-text-3))' }}>URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://mcp.example.com"
              type="url"
              className="w-full text-[12px] px-3 py-2 rounded-lg outline-none font-mono"
              style={{ background: 'rgb(var(--c-overlay-sm))', border: '1px solid rgb(var(--c-border-normal))', color: 'rgb(var(--c-text-1))' }}
            />
            <p className="text-[10px] mt-1" style={{ color: 'rgb(var(--c-text-3))' }}>
              Must expose <code className="font-mono">GET /tools/list</code> and <code className="font-mono">POST /tools/call</code>
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-semibold mb-1.5" style={{ color: 'rgb(var(--c-text-3))' }}>Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this MCP server do?"
              className="w-full text-[11px] px-3 py-2 rounded-lg outline-none"
              style={{ background: 'rgb(var(--c-overlay-sm))', border: '1px solid rgb(var(--c-border-subtle))', color: 'rgb(var(--c-text-1))' }}
            />
          </div>

          {/* Headers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-semibold" style={{ color: 'rgb(var(--c-text-3))' }}>
                Custom headers <span className="opacity-60">(optional)</span>
              </label>
              <button
                onClick={addHeader}
                className="text-[10px] px-2 py-0.5 rounded"
                style={{ background: 'rgb(var(--c-overlay-md))', color: 'rgb(var(--c-text-3))' }}
              >
                + Add
              </button>
            </div>
            <div className="space-y-1.5">
              {headers.map((h, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    value={h.key}
                    onChange={(e) => updateHeader(i, 'key', e.target.value)}
                    placeholder="Key"
                    className="w-1/3 text-[10px] px-2 py-1.5 rounded-lg outline-none font-mono"
                    style={{ background: 'rgb(var(--c-overlay-sm))', border: '1px solid rgb(var(--c-border-subtle))', color: 'rgb(var(--c-text-1))' }}
                  />
                  <input
                    value={h.value}
                    onChange={(e) => updateHeader(i, 'value', e.target.value)}
                    placeholder="Value"
                    type="password"
                    className="flex-1 text-[10px] px-2 py-1.5 rounded-lg outline-none font-mono"
                    style={{ background: 'rgb(var(--c-overlay-sm))', border: '1px solid rgb(var(--c-border-subtle))', color: 'rgb(var(--c-text-1))' }}
                  />
                  <button
                    onClick={() => removeHeader(i)}
                    className="text-[11px] w-6 h-6 rounded flex items-center justify-center opacity-50 hover:opacity-100"
                    style={{ background: 'rgb(var(--c-overlay-md))', color: 'rgb(var(--c-text-3))' }}
                  >×</button>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-[11px]" style={{ color: 'rgb(248 81 73)' }}>{error}</p>}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-3" style={{ borderTop: border }}>
          <button onClick={onClose} className="text-[12px] px-4 py-2 rounded-lg"
            style={{ background: 'rgb(var(--c-overlay-md))', color: 'rgb(var(--c-text-3))' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="text-[12px] px-4 py-2 rounded-lg font-semibold disabled:opacity-40"
            style={{ background: 'rgb(217 119 87)', color: '#fff' }}>
            {saving ? 'Saving…' : config ? 'Save changes' : 'Add server'}
          </button>
        </div>
      </div>
    </div>
  )
}
