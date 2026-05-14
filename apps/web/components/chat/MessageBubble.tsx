'use client'

interface Props {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

export function MessageBubble({ role, content, streaming }: Props) {
  const isUser = role === 'user'

  return (
    <div className={`flex gap-2.5 animate-fade-in ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      {!isUser && (
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
          style={{ background: 'linear-gradient(135deg, #d97757, #c8664a)', color: 'rgb(26 25 23)' }}
        >
          C
        </div>
      )}

      <div
        className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed max-w-[88%] ${
          isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'
        }`}
        style={
          isUser
            ? { background: 'rgb(217 119 87 / 0.2)', color: 'rgb(240 235 227)', border: '1px solid rgb(217 119 87 / 0.25)' }
            : { background: 'rgb(255 255 255 / 0.05)', color: 'rgb(240 235 227)', border: '1px solid rgb(255 255 255 / 0.07)' }
        }
      >
        {content ? (
          <MarkdownContent content={content} />
        ) : streaming ? null : (
          <span style={{ color: 'rgb(107 100 92)' }} className="italic">…</span>
        )}
        {streaming && (
          <span
            className="inline-block w-[2px] h-[14px] ml-0.5 align-middle animate-cursor"
            style={{ background: 'rgb(217 119 87)' }}
          />
        )}
      </div>
    </div>
  )
}

/* ── Markdown renderer ──────────────────────────────────────────── */
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Blank line
    if (line === '') {
      elements.push(<div key={i} className="h-1.5" />)
      i++
      continue
    }

    // Table — collect all table lines
    if (line.startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      elements.push(<TableBlock key={i} lines={tableLines} />)
      continue
    }

    // HR
    if (/^[-*_]{3,}$/.test(line.trim())) {
      elements.push(<hr key={i} style={{ borderColor: 'rgb(255 255 255 / 0.1)', margin: '8px 0' }} />)
      i++
      continue
    }

    // H2
    if (line.startsWith('## ')) {
      elements.push(
        <p key={i} className="font-semibold text-sm mt-1 mb-0.5" style={{ color: 'rgb(240 235 227)' }}
          dangerouslySetInnerHTML={{ __html: renderInline(line.slice(3)) }} />
      )
      i++
      continue
    }

    // H1
    if (line.startsWith('# ')) {
      elements.push(
        <p key={i} className="font-bold text-sm mt-1" style={{ color: 'rgb(240 235 227)' }}
          dangerouslySetInnerHTML={{ __html: renderInline(line.slice(2)) }} />
      )
      i++
      continue
    }

    // Bullet list
    if (line.startsWith('- ') || line.startsWith('• ')) {
      elements.push(
        <div key={i} className="flex gap-2 leading-snug">
          <span className="shrink-0 mt-0.5 text-[10px]" style={{ color: 'rgb(217 119 87)' }}>●</span>
          <span dangerouslySetInnerHTML={{ __html: renderInline(line.slice(2)) }} />
        </div>
      )
      i++
      continue
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)/)
      if (match) {
        elements.push(
          <div key={i} className="flex gap-2 leading-snug">
            <span className="shrink-0 font-mono text-[11px] mt-0.5 min-w-[16px]" style={{ color: 'rgb(217 119 87)' }}>
              {match[1]}.
            </span>
            <span dangerouslySetInnerHTML={{ __html: renderInline(match[2]) }} />
          </div>
        )
        i++
        continue
      }
    }

    // Normal paragraph
    elements.push(
      <p key={i} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: renderInline(line) }} />
    )
    i++
  }

  return <div className="prose-chat space-y-0.5">{elements}</div>
}

function TableBlock({ lines }: { lines: string[] }) {
  const rows = lines
    .filter((l) => !l.match(/^\|[-| :]+\|$/))
    .map((l) =>
      l.split('|')
        .slice(1, -1)
        .map((cell) => cell.trim())
    )

  if (rows.length === 0) return null
  const [header, ...body] = rows

  return (
    <div className="overflow-x-auto my-1.5 rounded-lg" style={{ border: '1px solid rgb(255 255 255 / 0.08)' }}>
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr style={{ background: 'rgb(255 255 255 / 0.04)' }}>
            {header.map((cell, j) => (
              <th key={j} className="px-3 py-1.5 text-left font-semibold uppercase tracking-wide text-[10px]"
                style={{ color: 'rgb(107 100 92)', borderBottom: '1px solid rgb(255 255 255 / 0.08)' }}>
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-1.5" style={{ color: 'rgb(240 235 227)', borderBottom: i < body.length - 1 ? '1px solid rgb(255 255 255 / 0.05)' : 'none' }}
                  dangerouslySetInnerHTML={{ __html: renderInline(cell) }} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function renderInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:rgb(240 235 227);font-weight:600">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em style="color:rgb(160 152 144)">$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:rgb(255 255 255 / 0.08);padding:0.15em 0.4em;border-radius:4px;font-size:0.8em;font-family:var(--font-mono,monospace)">$1</code>')
    .replace(/~~(.+?)~~/g, '<del style="color:rgb(107 100 92)">$1</del>')
}
