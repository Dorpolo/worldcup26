'use client'

const CATEGORY_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  preferences:          { bg: 'rgb(99 155 255 / 0.12)', color: 'rgb(99 155 255)',   label: 'Prefs'    },
  'league-notes':       { bg: 'rgb(217 119 87 / 0.12)', color: 'rgb(217 119 87)',   label: 'League'   },
  'player-observations':{ bg: 'rgb(63 185 80 / 0.12)',  color: 'rgb(63 185 80)',    label: 'Players'  },
  strategy:             { bg: 'rgb(180 80 230 / 0.12)', color: 'rgb(180 80 230)',   label: 'Strategy' },
  personal:             { bg: 'rgb(var(--c-overlay-md))', color: 'rgb(var(--c-text-3))', label: 'Personal' },
}

export interface Memory {
  _id: string
  content: string
  category: string
  source: 'auto' | 'manual'
  createdAt: string
}

interface Props {
  memory: Memory
  onDelete: (id: string) => void
}

export function MemoryCard({ memory, onDelete }: Props) {
  const style = CATEGORY_STYLES[memory.category] ?? CATEGORY_STYLES.personal

  return (
    <div
      className="group relative flex flex-col gap-1.5 p-2.5 rounded-lg"
      style={{ background: 'rgb(var(--c-overlay-xs))', border: '1px solid rgb(var(--c-border-subtle))' }}
    >
      <p className="text-[11px] leading-relaxed" style={{ color: 'rgb(var(--c-text-2))' }}>
        {memory.content}
      </p>

      <div className="flex items-center gap-1.5">
        <span
          className="text-[9px] font-medium px-1.5 py-0.5 rounded"
          style={{ background: style.bg, color: style.color }}
        >
          {style.label}
        </span>
        <span
          className="text-[9px] px-1.5 py-0.5 rounded"
          style={{
            background: memory.source === 'auto' ? 'rgb(var(--c-overlay-sm))' : 'rgb(217 119 87 / 0.10)',
            color: memory.source === 'auto' ? 'rgb(var(--c-text-3))' : 'rgb(217 119 87)',
          }}
        >
          {memory.source === 'auto' ? 'auto' : 'manual'}
        </span>
      </div>

      {/* Delete button */}
      <button
        onClick={() => onDelete(memory._id)}
        className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full items-center justify-center text-[9px] hidden group-hover:flex transition-all hover:opacity-100 opacity-60"
        style={{ background: 'rgb(248 81 73 / 0.12)', color: 'rgb(248 81 73)' }}
      >×</button>
    </div>
  )
}
