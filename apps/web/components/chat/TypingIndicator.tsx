'use client'

interface Props { label: string }

export function TypingIndicator({ label }: Props) {
  return (
    <div className="flex gap-2.5 animate-fade-in">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
        style={{ background: 'linear-gradient(135deg, #d97757, #c8664a)', color: 'rgb(var(--c-bg))' }}
      >
        C
      </div>
      <div
        className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-2.5 text-[12px]"
        style={{ background: 'rgb(var(--c-overlay-md))', border: '1px solid rgb(var(--c-border-subtle))', color: 'rgb(var(--c-text-3))' }}
      >
        <span className="flex items-center gap-[3px]">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot-1" style={{ background: 'rgb(217 119 87)' }} />
          <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot-2" style={{ background: 'rgb(217 119 87)' }} />
          <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot-3" style={{ background: 'rgb(217 119 87)' }} />
        </span>
        <span>{label}</span>
      </div>
    </div>
  )
}
