import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { JoinClient } from './JoinClient'

interface Props { params: { token: string } }

export default async function JoinPage({ params }: Props) {
  const session = await auth()
  if (!session?.user) {
    redirect(`/login?callbackUrl=/join/${params.token}`)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'rgb(var(--c-bg))' }}
    >
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgb(217 119 87 / 0.08) 0%, transparent 70%)' }}
      />
      <JoinClient token={params.token} />
    </div>
  )
}
