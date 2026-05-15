import { notFound } from 'next/navigation'
import { connectDB, LeagueModel } from '@worldcup26/db'
import { generateRulesMarkdown } from '@worldcup26/config'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props { params: { leagueId: string } }

export default async function RulesPage({ params }: Props) {
  await connectDB()
  const league = await LeagueModel.findOne({ slug: params.leagueId }).lean() as any
  if (!league) notFound()

  const markdown = generateRulesMarkdown(league.name, league.scoringConfig as any)

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="rules-prose max-w-3xl">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-xl font-bold mb-4 mt-2" style={{ color: 'rgb(var(--c-text-1))' }}>{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-[14px] font-semibold mt-6 mb-2" style={{ color: 'rgb(var(--c-text-1))' }}>{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-[13px] font-semibold mt-4 mb-1" style={{ color: 'rgb(200 196 190)' }}>{children}</h3>
            ),
            p: ({ children }) => (
              <p className="text-[13px] leading-relaxed mb-2" style={{ color: 'rgb(var(--c-text-2))' }}>{children}</p>
            ),
            blockquote: ({ children }) => (
              <blockquote
                className="pl-4 py-1 my-2 text-[12px] italic"
                style={{ borderLeft: '2px solid rgb(217 119 87 / 0.5)', color: 'rgb(var(--c-text-2))' }}
              >
                {children}
              </blockquote>
            ),
            ul: ({ children }) => (
              <ul className="space-y-0.5 mb-2">{children}</ul>
            ),
            li: ({ children }) => (
              <li className="flex gap-2.5 text-[13px] py-0.5">
                <span className="shrink-0 mt-1 text-[8px]" style={{ color: 'rgb(217 119 87)' }}>●</span>
                <span style={{ color: 'rgb(var(--c-text-2))' }}>{children}</span>
              </li>
            ),
            hr: () => (
              <hr className="my-4" style={{ borderColor: 'rgb(var(--c-border-normal))' }} />
            ),
            strong: ({ children }) => (
              <strong style={{ color: 'rgb(var(--c-text-1))', fontWeight: 600 }}>{children}</strong>
            ),
            code: ({ children }) => (
              <code
                className="text-[0.8em] font-mono px-1 py-0.5 rounded"
                style={{ background: 'rgb(var(--c-border-normal))', color: 'rgb(217 119 87)' }}
              >
                {children}
              </code>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-4">
                <table className="w-full text-[12px] border-collapse">{children}</table>
              </div>
            ),
            thead: ({ children }) => (
              <thead style={{ borderBottom: '1px solid rgb(var(--c-border-normal))' }}>{children}</thead>
            ),
            th: ({ children }) => (
              <th
                className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'rgb(var(--c-text-3))' }}
              >
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td
                className="py-2 px-3"
                style={{ color: 'rgb(var(--c-text-2))', borderBottom: '1px solid rgb(var(--c-overlay-sm))' }}
              >
                {children}
              </td>
            ),
            tr: ({ children }) => (
              <tr className="transition-colors hover:bg-white/[0.02]">{children}</tr>
            ),
          }}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    </div>
  )
}
