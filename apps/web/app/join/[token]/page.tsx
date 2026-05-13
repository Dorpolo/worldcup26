import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { JoinClient } from './JoinClient'

interface Props {
  params: { token: string }
}

export default async function JoinPage({ params }: Props) {
  const session = await auth()

  if (!session?.user) {
    // Store the token in the redirect URL so we return here after login
    redirect(`/login?callbackUrl=/join/${params.token}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <JoinClient token={params.token} />
    </div>
  )
}
