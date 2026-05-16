'use client'

import { useState, useEffect } from 'react'
import { MCPServerRow } from './MCPServerRow'
import { MCPServerModal, type MCPConfig } from './MCPServerModal'

export function MCPServersPanel() {
  const [configs, setConfigs] = useState<MCPConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingConfig, setEditingConfig] = useState<MCPConfig | undefined>()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, any>>({})

  useEffect(() => { loadConfigs() }, [])

  async function loadConfigs() {
    setLoading(true)
    try {
      const res = await fetch('/api/mcp-configs')
      const data = await res.json()
      if (data.ok) setConfigs(data.data)
    } catch {}
    setLoading(false)
  }

  async function createConfig(configData: Omit<MCPConfig, '_id' | 'toolCount' | 'lastTestedAt'>) {
    const res = await fetch('/api/mcp-configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configData),
    })
    const data = await res.json()
    if (data.ok) setConfigs((prev) => [data.data, ...prev])
  }

  async function updateConfig(id: string, configData: Omit<MCPConfig, '_id' | 'toolCount' | 'lastTestedAt'>) {
    const res = await fetch(`/api/mcp-configs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configData),
    })
    const data = await res.json()
    if (data.ok) setConfigs((prev) => prev.map((c) => c._id === id ? data.data : c))
  }

  async function deleteConfig(id: string) {
    setConfigs((prev) => prev.filter((c) => c._id !== id))
    await fetch(`/api/mcp-configs/${id}`, { method: 'DELETE' })
    setConfirmDeleteId(null)
  }

  async function toggleConfig(id: string) {
    const config = configs.find((c) => c._id === id)
    if (!config) return
    setConfigs((prev) => prev.map((c) => c._id === id ? { ...c, enabled: !c.enabled } : c))
    await fetch(`/api/mcp-configs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !config.enabled }),
    })
  }

  async function testConfig(id: string) {
    setTestingId(id)
    setTestResults((prev) => ({ ...prev, [id]: null }))
    try {
      const res = await fetch(`/api/mcp-configs/${id}/test`, { method: 'POST' })
      const data = await res.json()
      setTestResults((prev) => ({ ...prev, [id]: data }))
      if (data.ok) {
        setConfigs((prev) => prev.map((c) =>
          c._id === id ? { ...c, toolCount: data.tools?.length ?? 0, lastTestedAt: new Date().toISOString() } : c
        ))
      }
    } catch {
      setTestResults((prev) => ({ ...prev, [id]: { ok: false, error: 'Request failed' } }))
    } finally {
      setTestingId(null)
    }
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[14px] font-semibold" style={{ color: 'rgb(var(--c-text-1))' }}>MCP Servers</h2>
          <p className="text-[11px] mt-0.5" style={{ color: 'rgb(var(--c-text-3))' }}>
            Connect external MCP-compatible tool servers
          </p>
        </div>
        <button
          onClick={() => { setEditingConfig(undefined); setShowModal(true) }}
          className="flex items-center gap-1.5 text-[12px] px-3 py-2 rounded-lg font-medium"
          style={{ background: 'rgb(217 119 87)', color: '#fff' }}
        >
          <span>+</span>
          <span>Add server</span>
        </button>
      </div>

      {/* Info */}
      <div className="p-3 rounded-lg mb-6" style={{ background: 'rgb(var(--c-overlay-xs))', border: '1px solid rgb(var(--c-border-subtle))' }}>
        <p className="text-[10px]" style={{ color: 'rgb(var(--c-text-3))' }}>
          MCP servers expose tools via{' '}
          <code className="font-mono text-[10px]" style={{ color: 'rgb(217 119 87)' }}>GET /tools/list</code>{' '}
          and{' '}
          <code className="font-mono text-[10px]" style={{ color: 'rgb(217 119 87)' }}>POST /tools/call</code>.
          Enabled servers are automatically available to the AI agent.
        </p>
      </div>

      {loading && (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'rgb(var(--c-overlay-sm))' }} />
          ))}
        </div>
      )}

      {!loading && configs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <span className="text-4xl">⊕</span>
          <p className="text-[13px] font-medium" style={{ color: 'rgb(var(--c-text-2))' }}>No MCP servers</p>
          <p className="text-[11px] text-center max-w-[280px]" style={{ color: 'rgb(var(--c-text-3))' }}>
            Connect external MCP servers to give the AI access to more tools.
          </p>
        </div>
      )}

      {!loading && configs.length > 0 && (
        <div className="space-y-3">
          {configs.map((config) => (
            <div key={config._id}>
              {confirmDeleteId === config._id ? (
                <div
                  className="flex items-center gap-3 p-4 rounded-xl"
                  style={{ background: 'rgb(248 81 73 / 0.06)', border: '1px solid rgb(248 81 73 / 0.2)' }}
                >
                  <p className="text-[12px] flex-1" style={{ color: 'rgb(248 81 73)' }}>Delete "{config.name}"?</p>
                  <button onClick={() => deleteConfig(config._id)} className="text-[11px] px-2.5 py-1 rounded-lg"
                    style={{ background: 'rgb(248 81 73 / 0.15)', color: 'rgb(248 81 73)' }}>
                    Yes
                  </button>
                  <button onClick={() => setConfirmDeleteId(null)} className="text-[11px] px-2.5 py-1 rounded-lg"
                    style={{ background: 'rgb(var(--c-overlay-md))', color: 'rgb(var(--c-text-3))' }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <MCPServerRow
                  config={config}
                  onEdit={() => { setEditingConfig(config); setShowModal(true) }}
                  onDelete={() => setConfirmDeleteId(config._id)}
                  onToggle={() => toggleConfig(config._id)}
                  onTest={() => testConfig(config._id)}
                  testing={testingId === config._id}
                  testResult={testResults[config._id]}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <MCPServerModal
          config={editingConfig}
          onSave={editingConfig ? (data) => updateConfig(editingConfig._id, data) : createConfig}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
