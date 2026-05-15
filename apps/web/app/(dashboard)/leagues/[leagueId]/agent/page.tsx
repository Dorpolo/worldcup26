import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { AgentExperienceClient } from '@/components/agent/AgentExperienceClient'

interface Props {
  params: { leagueId: string }
}

export default async function AgentPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  return <AgentExperienceClient leagueId={params.leagueId} />
}
