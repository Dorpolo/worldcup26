import { notFound } from 'next/navigation'
import { connectDB, LeagueModel } from '@worldcup26/db'
import { generateRulesMarkdown } from '@worldcup26/config'

interface Props {
  params: { leagueId: string }
}

export default async function RulesPage({ params }: Props) {
  await connectDB()
  const league = await LeagueModel.findOne({ slug: params.leagueId }).lean() as any
  if (!league) notFound()

  const markdown = generateRulesMarkdown(league.name, league.scoringConfig as any)

  // Simple markdown renderer (replace with react-markdown in Phase 9 polish)
  const lines = markdown.split('\n')

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto prose prose-sm">
        {lines.map((line, i) => {
          if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold mb-4">{line.slice(2)}</h1>
          if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-semibold mt-6 mb-2">{line.slice(3)}</h2>
          if (line.startsWith('### ')) return <h3 key={i} className="font-semibold mt-4 mb-1">{line.slice(4)}</h3>
          if (line.startsWith('> ')) return <blockquote key={i} className="border-l-4 border-primary/30 pl-4 text-muted-foreground italic my-2">{line.slice(2)}</blockquote>
          if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc text-sm">{line.slice(2)}</li>
          if (line.startsWith('|')) return null // tables handled below
          if (line === '') return <div key={i} className="h-2" />
          return <p key={i} className="text-sm text-muted-foreground">{line}</p>
        })}
      </div>
    </div>
  )
}
