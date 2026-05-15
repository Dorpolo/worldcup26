'use client'

import { useState, useEffect } from 'react'
import { SkillCard } from './SkillCard'
import { SkillModal, type Skill } from './SkillModal'

export function SkillsPanel() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Skill | undefined>()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => { loadSkills() }, [])

  async function loadSkills() {
    setLoading(true)
    try {
      const res = await fetch('/api/skills')
      const data = await res.json()
      if (data.ok) setSkills(data.data)
    } catch {}
    setLoading(false)
  }

  async function createSkill(skillData: Omit<Skill, '_id'>) {
    const res = await fetch('/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(skillData),
    })
    const data = await res.json()
    if (data.ok) setSkills((prev) => [data.data, ...prev])
  }

  async function updateSkill(id: string, skillData: Omit<Skill, '_id'>) {
    const res = await fetch(`/api/skills/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(skillData),
    })
    const data = await res.json()
    if (data.ok) setSkills((prev) => prev.map((s) => s._id === id ? data.data : s))
  }

  async function deleteSkill(id: string) {
    setSkills((prev) => prev.filter((s) => s._id !== id))
    await fetch(`/api/skills/${id}`, { method: 'DELETE' })
    setConfirmDeleteId(null)
  }

  async function toggleSkill(id: string) {
    const skill = skills.find((s) => s._id === id)
    if (!skill) return
    setSkills((prev) => prev.map((s) => s._id === id ? { ...s, enabled: !s.enabled } : s))
    await fetch(`/api/skills/${id}/toggle`, { method: 'PATCH' })
  }

  function openCreate() {
    setEditingSkill(undefined)
    setShowModal(true)
  }

  function openEdit(skill: Skill) {
    setEditingSkill(skill)
    setShowModal(true)
  }

  const border = '1px solid rgb(var(--c-border-subtle))'
  const enabledCount = skills.filter((s) => s.enabled).length

  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[14px] font-semibold" style={{ color: 'rgb(var(--c-text-1))' }}>Skills</h2>
          <p className="text-[11px] mt-0.5" style={{ color: 'rgb(var(--c-text-3))' }}>
            {enabledCount} active · {skills.length} total
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 text-[12px] px-3 py-2 rounded-lg font-medium transition-all hover:opacity-90"
          style={{ background: 'rgb(217 119 87)', color: '#fff' }}
        >
          <span>+</span>
          <span>New skill</span>
        </button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-3 rounded-lg" style={{ background: 'rgb(99 155 255 / 0.06)', border: '1px solid rgb(99 155 255 / 0.15)' }}>
          <p className="text-[10px] font-semibold mb-1" style={{ color: 'rgb(99 155 255)' }}>📝 Instructions</p>
          <p className="text-[10px]" style={{ color: 'rgb(var(--c-text-3))' }}>
            Appended to the AI system prompt on every message
          </p>
        </div>
        <div className="p-3 rounded-lg" style={{ background: 'rgb(63 185 80 / 0.06)', border: '1px solid rgb(63 185 80 / 0.15)' }}>
          <p className="text-[10px] font-semibold mb-1" style={{ color: 'rgb(63 185 80)' }}>🔧 Tools</p>
          <p className="text-[10px]" style={{ color: 'rgb(var(--c-text-3))' }}>
            Called as a dedicated tool when the AI needs them
          </p>
        </div>
      </div>

      {/* Skill grid */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: 'rgb(var(--c-overlay-sm))' }} />
          ))}
        </div>
      )}

      {!loading && skills.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <span className="text-4xl">⚡</span>
          <p className="text-[13px] font-medium" style={{ color: 'rgb(var(--c-text-2))' }}>No skills yet</p>
          <p className="text-[11px] text-center max-w-[280px]" style={{ color: 'rgb(var(--c-text-3))' }}>
            Create instructions to guide the AI or tools it can call when needed.
          </p>
          <button
            onClick={openCreate}
            className="text-[12px] px-4 py-2 rounded-lg font-medium mt-2"
            style={{ background: 'rgb(217 119 87)', color: '#fff' }}
          >
            Create your first skill
          </button>
        </div>
      )}

      {!loading && skills.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {skills.map((skill) => (
            <div key={skill._id}>
              {confirmDeleteId === skill._id ? (
                <div
                  className="flex items-center gap-3 p-4 rounded-xl"
                  style={{ background: 'rgb(248 81 73 / 0.06)', border: '1px solid rgb(248 81 73 / 0.2)' }}
                >
                  <p className="text-[12px] flex-1" style={{ color: 'rgb(248 81 73)' }}>
                    Delete "{skill.name}"?
                  </p>
                  <button
                    onClick={() => deleteSkill(skill._id)}
                    className="text-[11px] px-2.5 py-1 rounded-lg"
                    style={{ background: 'rgb(248 81 73 / 0.15)', color: 'rgb(248 81 73)' }}
                  >Yes, delete</button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-[11px] px-2.5 py-1 rounded-lg"
                    style={{ background: 'rgb(var(--c-overlay-md))', color: 'rgb(var(--c-text-3))' }}
                  >Cancel</button>
                </div>
              ) : (
                <SkillCard
                  skill={skill}
                  onEdit={() => openEdit(skill)}
                  onDelete={() => setConfirmDeleteId(skill._id)}
                  onToggle={() => toggleSkill(skill._id)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <SkillModal
          skill={editingSkill}
          onSave={editingSkill ? (data) => updateSkill(editingSkill._id, data) : createSkill}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
