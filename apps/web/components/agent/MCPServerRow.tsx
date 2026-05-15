'use client'

import type { MCPConfig } from './MCPServerModal'

interface Props {
  config: MCPConfig
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
  onTest: () => void
  testing: boolean
  testResult?: { ok: boolean; tools?: { name: string; description: string }[]; error?: string } | null
}

export function MCPServerRow({ config, onEdit, onDelete, onToggle, onTest, testing, testResult }: Props) {
  const border = '1px solid rgb(var(--c-border-subtle))'

  const maskedUrl = (() => {
    try {
      const u = new URL(config.url)
      return u.hostname + (u.port ? `:${u.port}` : '')
    } catch {
      return config.url.slice(0, 40)
    }
  })()

  return (
    <div
      className="group flex flex-col gap-2 p-4 rounded-xl transition-all"
      style={{
        background: config.enabled ? 'rgb(var(--c-overlay-xs))' : 'rgb(var(--c-bg))',
        border,
        opacity: config.enabled ? 1 : 0.6,
      }}
    >
      <div className="flex items-center gap-3">
        {/* Status dot */}
        <div
          className="w-2 h-2 rounded-full shrink-0 mt-0.5"
          style={{ background: config.enabled ? 'rgb(63 185 80)' : 'rgb(var(--c-border-normal))' }}
        />

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold truncate" style={{ color: 'rgb(var(--c-text-1))' }}>
            {config.name}
          </p>
          <p className="text-[10px] font-mono truncate" style={{ color: 'rgb(var(--c-text-3))' }}>
            {maskedUrl}
          </p>
        </div>

        {/* Tool count badge */}
        {config.toolCount > 0 && (
          <span
            className="shrink-0 text-[9px] px-1.5 py-0.5 rounded font-medium"
            style={{ background: 'rgb(63 185 80 / 0.12)', color: 'rgb(63 185 80)' }}
          >
            {config.toolCount} tool{config.toolCount !== 1 ? 's' : ''}
          </span>
        )}

        {/* Test button */}
        <button
          onClick={onTest}
          disabled={testing}
          className="shrink-0 text-[10px] px-2.5 py-1 rounded-lg transition-all disabled:opacity-50"
          style={{
            background: 'rgb(var(--c-overlay-md))',
            border,
            color: 'rgb(var(--c-text-2))',
          }}
        >
          {testing ? '…' : 'Test'}
        </button>

        {/* Toggle */}
        <button
          onClick={onToggle}
          className="shrink-0 relative rounded-full transition-all"
          style={{
            background: config.enabled ? 'rgb(217 119 87)' : 'rgb(var(--c-border-normal))',
            width: '30px', height: '17px',
          }}
        >
          <span
            className="absolute top-0.5 rounded-full transition-all bg-white"
            style={{ width: '13px', height: '13px', left: config.enabled ? '15px' : '2px' }}
          />
        </button>
      </div>

      {/* Description */}
      {config.description && (
        <p className="text-[11px]" style={{ color: 'rgb(var(--c-text-3))' }}>{config.description}</p>
      )}

      {/* Last tested */}
      {config.lastTestedAt && (
        <p className="text-[10px]" style={{ color: 'rgb(var(--c-text-3))' }}>
          Last tested: {new Date(config.lastTestedAt).toLocaleString()}
        </p>
      )}

      {/* Test result */}
      {testResult && (
        <div
          className="rounded-lg px-3 py-2 text-[11px] animate-fade-in"
          style={{
            background: testResult.ok ? 'rgb(63 185 80 / 0.08)' : 'rgb(248 81 73 / 0.08)',
            border: testResult.ok ? '1px solid rgb(63 185 80 / 0.2)' : '1px solid rgb(248 81 73 / 0.2)',
            color: testResult.ok ? 'rgb(63 185 80)' : 'rgb(248 81 73)',
          }}
        >
          {testResult.ok ? (
            <>
              <p className="font-medium mb-1">✓ Connected · {testResult.tools?.length ?? 0} tools found</p>
              {testResult.tools && testResult.tools.length > 0 && (
                <div className="space-y-0.5 mt-1">
                  {testResult.tools.slice(0, 5).map((t) => (
                    <p key={t.name} className="font-mono text-[9px] opacity-80">{t.name}</p>
                  ))}
                  {testResult.tools.length > 5 && (
                    <p className="text-[9px] opacity-60">+{testResult.tools.length - 5} more</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <p>✕ {testResult.error || 'Connection failed'}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="hidden group-hover:flex items-center gap-1.5 mt-0.5">
        <button onClick={onEdit} className="text-[10px] px-2 py-1 rounded-md"
          style={{ background: 'rgb(var(--c-overlay-md))', color: 'rgb(var(--c-text-2))' }}>
          Edit
        </button>
        <button onClick={onDelete} className="text-[10px] px-2 py-1 rounded-md"
          style={{ background: 'rgb(248 81 73 / 0.08)', color: 'rgb(248 81 73)' }}>
          Delete
        </button>
      </div>
    </div>
  )
}
