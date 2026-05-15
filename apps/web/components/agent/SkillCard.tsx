'use client'

import type { Skill } from './SkillModal'

interface Props {
  skill: Skill
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}

export function SkillCard({ skill, onEdit, onDelete, onToggle }: Props) {
  const border = '1px solid rgb(var(--c-border-subtle))'

  return (
    <div
      className="group flex flex-col gap-2 p-4 rounded-xl transition-all hover:shadow-sm"
      style={{
        background: skill.enabled ? 'rgb(var(--c-overlay-xs))' : 'rgb(var(--c-bg))',
        border: skill.enabled ? border : '1px solid rgb(var(--c-border-subtle))',
        opacity: skill.enabled ? 1 : 0.6,
      }}
    >
      {/* Top row */}
      <div className="flex items-start gap-2.5">
        <span className="text-xl shrink-0 mt-0.5">{skill.icon || '⚡'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[13px] font-semibold truncate" style={{ color: 'rgb(var(--c-text-1))' }}>
              {skill.name}
            </p>
            <span
              className="shrink-0 text-[9px] px-1.5 py-0.5 rounded font-medium"
              style={{
                background: skill.type === 'instruction' ? 'rgb(99 155 255 / 0.12)' : 'rgb(63 185 80 / 0.12)',
                color: skill.type === 'instruction' ? 'rgb(99 155 255)' : 'rgb(63 185 80)',
              }}
            >
              {skill.type}
            </span>
          </div>
          {skill.description && (
            <p className="text-[11px] truncate" style={{ color: 'rgb(var(--c-text-3))' }}>
              {skill.description}
            </p>
          )}
        </div>

        {/* Toggle */}
        <button
          onClick={onToggle}
          className="shrink-0 relative w-8 h-4.5 rounded-full transition-all mt-0.5"
          style={{
            background: skill.enabled ? 'rgb(217 119 87)' : 'rgb(var(--c-border-normal))',
            width: '30px', height: '17px',
          }}
          title={skill.enabled ? 'Disable' : 'Enable'}
        >
          <span
            className="absolute top-0.5 rounded-full transition-all"
            style={{
              width: '13px', height: '13px',
              background: '#fff',
              left: skill.enabled ? '15px' : '2px',
            }}
          />
        </button>
      </div>

      {/* Tags */}
      {skill.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {skill.tags.map((tag) => (
            <span
              key={tag}
              className="text-[9px] px-1.5 py-0.5 rounded"
              style={{ background: 'rgb(var(--c-overlay-sm))', color: 'rgb(var(--c-text-3))' }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Prompt preview */}
      <p className="text-[10px] line-clamp-2 font-mono" style={{ color: 'rgb(var(--c-text-3))' }}>
        {skill.prompt}
      </p>

      {/* Actions — visible on hover */}
      <div className="hidden group-hover:flex items-center gap-1.5 mt-1">
        <button
          onClick={onEdit}
          className="text-[10px] px-2 py-1 rounded-md transition-all"
          style={{ background: 'rgb(var(--c-overlay-md))', color: 'rgb(var(--c-text-2))' }}
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="text-[10px] px-2 py-1 rounded-md transition-all"
          style={{ background: 'rgb(248 81 73 / 0.08)', color: 'rgb(248 81 73)' }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}
