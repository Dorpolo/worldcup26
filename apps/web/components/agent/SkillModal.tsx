'use client'

import { useState, useEffect } from 'react'

export interface Skill {
  _id: string
  name: string
  description: string
  type: 'instruction' | 'tool'
  prompt: string
  icon: string
  tags: string[]
  enabled: boolean
}

interface Props {
  skill?: Skill
  onSave: (data: Omit<Skill, '_id'>) => Promise<void>
  onClose: () => void
}

const ICONS = ['⚡', '🎯', '🔍', '📊', '🌐', '⚽', '🏆', '📝', '💡', '🔔', '🤖', '🎲']

export function SkillModal({ skill, onSave, onClose }: Props) {
  const [name, setName] = useState(skill?.name ?? '')
  const [description, setDescription] = useState(skill?.description ?? '')
  const [type, setType] = useState<'instruction' | 'tool'>(skill?.type ?? 'instruction')
  const [prompt, setPrompt] = useState(skill?.prompt ?? '')
  const [icon, setIcon] = useState(skill?.icon ?? '⚡')
  const [tags, setTags] = useState(skill?.tags?.join(', ') ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const border = '1px solid rgb(var(--c-border-subtle))'

  async function handleSave() {
    if (!name.trim() || !prompt.trim()) {
      setError('Name and prompt are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        type,
        prompt: prompt.trim(),
        icon,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        enabled: skill?.enabled ?? true,
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
          <span className="text-xl">{icon}</span>
          <h2 className="flex-1 text-[14px] font-semibold" style={{ color: 'rgb(var(--c-text-1))' }}>
            {skill ? 'Edit skill' : 'New skill'}
          </h2>
          <button onClick={onClose} className="text-[18px] opacity-50 hover:opacity-100" style={{ color: 'rgb(var(--c-text-3))' }}>×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Icon picker */}
          <div>
            <label className="block text-[10px] font-semibold mb-2" style={{ color: 'rgb(var(--c-text-3))' }}>Icon</label>
            <div className="flex flex-wrap gap-1.5">
              {ICONS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className="w-8 h-8 rounded-lg text-[16px] flex items-center justify-center transition-all"
                  style={{
                    background: icon === ic ? 'rgb(217 119 87 / 0.15)' : 'rgb(var(--c-overlay-sm))',
                    border: icon === ic ? '1px solid rgb(217 119 87 / 0.4)' : '1px solid transparent',
                  }}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-[10px] font-semibold mb-1.5" style={{ color: 'rgb(var(--c-text-3))' }}>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Prediction Coach"
              className="w-full text-[12px] px-3 py-2 rounded-lg outline-none"
              style={{ background: 'rgb(var(--c-overlay-sm))', border: '1px solid rgb(var(--c-border-normal))', color: 'rgb(var(--c-text-1))' }}
            />
          </div>

          {/* Type toggle */}
          <div>
            <label className="block text-[10px] font-semibold mb-2" style={{ color: 'rgb(var(--c-text-3))' }}>Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(['instruction', 'tool'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className="px-3 py-2.5 rounded-lg text-left transition-all"
                  style={{
                    background: type === t ? 'rgb(217 119 87 / 0.10)' : 'rgb(var(--c-overlay-xs))',
                    border: type === t ? '1px solid rgb(217 119 87 / 0.35)' : '1px solid rgb(var(--c-border-subtle))',
                  }}
                >
                  <p className="text-[12px] font-semibold" style={{ color: type === t ? 'rgb(217 119 87)' : 'rgb(var(--c-text-1))' }}>
                    {t === 'instruction' ? '📝 Instruction' : '🔧 Tool'}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgb(var(--c-text-3))' }}>
                    {t === 'instruction' ? 'Appended to system prompt' : 'Called as a dedicated tool'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-[10px] font-semibold mb-1.5" style={{ color: 'rgb(var(--c-text-3))' }}>
              {type === 'instruction' ? 'Instruction prompt' : 'Tool prompt'}
              {type === 'tool' && <span className="ml-1 opacity-60">(use {'{query}'} for user input)</span>}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={type === 'instruction'
                ? 'e.g. Always suggest under/over 2.5 goals predictions when possible…'
                : 'e.g. You are a football analyst. Given this query: {query}, provide a detailed tactical analysis…'}
              rows={6}
              className="w-full text-[11px] px-3 py-2 rounded-lg resize-none outline-none font-mono leading-relaxed"
              style={{
                background: 'rgb(var(--c-overlay-sm))',
                border: '1px solid rgb(var(--c-border-normal))',
                color: 'rgb(var(--c-text-1))',
              }}
            />
            <p className="text-[10px] mt-1" style={{ color: 'rgb(var(--c-text-3))' }}>
              {prompt.length}/4000
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-semibold mb-1.5" style={{ color: 'rgb(var(--c-text-3))' }}>
              Description <span className="opacity-60">(optional)</span>
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of what this skill does…"
              className="w-full text-[11px] px-3 py-2 rounded-lg outline-none"
              style={{ background: 'rgb(var(--c-overlay-sm))', border: '1px solid rgb(var(--c-border-subtle))', color: 'rgb(var(--c-text-1))' }}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[10px] font-semibold mb-1.5" style={{ color: 'rgb(var(--c-text-3))' }}>
              Tags <span className="opacity-60">(comma-separated)</span>
            </label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="predictions, analysis, tactics"
              className="w-full text-[11px] px-3 py-2 rounded-lg outline-none"
              style={{ background: 'rgb(var(--c-overlay-sm))', border: '1px solid rgb(var(--c-border-subtle))', color: 'rgb(var(--c-text-1))' }}
            />
          </div>

          {error && <p className="text-[11px]" style={{ color: 'rgb(248 81 73)' }}>{error}</p>}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-3" style={{ borderTop: border }}>
          <button
            onClick={onClose}
            className="text-[12px] px-4 py-2 rounded-lg"
            style={{ background: 'rgb(var(--c-overlay-md))', color: 'rgb(var(--c-text-3))' }}
          >Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-[12px] px-4 py-2 rounded-lg font-semibold disabled:opacity-40"
            style={{ background: 'rgb(217 119 87)', color: '#fff' }}
          >
            {saving ? 'Saving…' : skill ? 'Save changes' : 'Create skill'}
          </button>
        </div>
      </div>
    </div>
  )
}
