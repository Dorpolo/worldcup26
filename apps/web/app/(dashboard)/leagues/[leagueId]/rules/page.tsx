import { notFound } from 'next/navigation'
import { connectDB, LeagueModel } from '@worldcup26/db'
import { generateRulesMarkdown } from '@worldcup26/config'

interface Props { params: { leagueId: string } }

export default async function RulesPage({ params }: Props) {
  await connectDB()
  const league = await LeagueModel.findOne({ slug: params.leagueId }).lean() as any
  if (!league) notFound()

  const markdown = generateRulesMarkdown(league.name, league.scoringConfig as any)

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="max-w-2xl mx-auto">
        <RulesContent markdown={markdown} />
      </div>
    </div>
  )
}

function RulesContent({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n')

  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        if (line.startsWith('# ')) {
          return (
            <h1 key={i} className="text-xl font-bold mb-4 mt-2"
              style={{ color: 'rgb(240 235 227)' }}>
              {line.slice(2)}
            </h1>
          )
        }

        if (line.startsWith('## ')) {
          return (
            <h2 key={i} className="text-[14px] font-semibold mt-6 mb-2"
              style={{ color: 'rgb(240 235 227)' }}>
              {line.slice(3)}
            </h2>
          )
        }

        if (line.startsWith('### ')) {
          return (
            <h3 key={i} className="text-[13px] font-semibold mt-4 mb-1"
              style={{ color: 'rgb(200 196 190)' }}>
              {line.slice(4)}
            </h3>
          )
        }

        if (line.startsWith('> ')) {
          return (
            <blockquote key={i}
              className="pl-4 py-1 my-2 text-[12px] italic"
              style={{
                borderLeft: '2px solid rgb(217 119 87 / 0.5)',
                color: 'rgb(160 152 144)',
              }}>
              <InlineMarkdown text={line.slice(2)} />
            </blockquote>
          )
        }

        if (line.startsWith('- ')) {
          return (
            <div key={i} className="flex gap-2.5 text-[13px] py-0.5">
              <span className="shrink-0 mt-1 text-[8px]" style={{ color: 'rgb(217 119 87)' }}>●</span>
              <span style={{ color: 'rgb(160 152 144)' }}>
                <InlineMarkdown text={line.slice(2)} />
              </span>
            </div>
          )
        }

        if (line === '---') {
          return (
            <hr key={i} className="my-4"
              style={{ borderColor: 'rgb(255 255 255 / 0.08)' }} />
          )
        }

        if (line === '') {
          return <div key={i} className="h-1.5" />
        }

        return (
          <p key={i} className="text-[13px] leading-relaxed"
            style={{ color: 'rgb(160 152 144)' }}>
            <InlineMarkdown text={line} />
          </p>
        )
      })}
    </div>
  )
}

function InlineMarkdown({ text }: { text: string }) {
  // Split on **bold** patterns, render segments
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} style={{ color: 'rgb(240 235 227)', fontWeight: 600 }}>
              {part.slice(2, -2)}
            </strong>
          )
        }
        // Handle inline code
        if (part.includes('`')) {
          const codeParts = part.split(/(`[^`]+`)/g)
          return (
            <span key={i}>
              {codeParts.map((cp, j) =>
                cp.startsWith('`') && cp.endsWith('`') ? (
                  <code key={j} className="text-[0.8em] font-mono px-1 py-0.5 rounded"
                    style={{ background: 'rgb(255 255 255 / 0.08)', color: 'rgb(217 119 87)' }}>
                    {cp.slice(1, -1)}
                  </code>
                ) : (
                  <span key={j}>{cp}</span>
                )
              )}
            </span>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}
