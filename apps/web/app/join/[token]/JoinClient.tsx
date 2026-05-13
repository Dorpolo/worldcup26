'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  token: string
}

export function JoinClient({ token }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<'joining' | 'success' | 'already' | 'error'>('joining')
  const [leagueName, setLeagueName] = useState<string>('')
  const [leagueSlug, setLeagueSlug] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function join() {
      try {
        const res = await fetch(`/api/leagues/join/${token}`, { method: 'POST' })
        const data = await res.json()

        if (!res.ok) {
          setErrorMsg(data.error ?? 'Invalid or expired invite link')
          setStatus('error')
          return
        }

        setLeagueName(data.data.league?.name ?? 'the league')
        setLeagueSlug(data.data.league?.slug ?? '')

        if (data.data.alreadyMember) {
          setStatus('already')
        } else {
          setStatus('success')
        }
      } catch {
        setErrorMsg('Something went wrong. Please try again.')
        setStatus('error')
      }
    }
    join()
  }, [token])

  function goToLeague() {
    if (leagueSlug) router.push(`/leagues/${leagueSlug}`)
    else router.push('/leagues')
  }

  if (status === 'joining') {
    return (
      <div className="text-center space-y-3">
        <div className="text-4xl animate-pulse">⚽</div>
        <p className="text-muted-foreground">Joining league…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="max-w-sm w-full border rounded-xl p-8 text-center space-y-4">
        <div className="text-4xl">❌</div>
        <h1 className="text-lg font-semibold">Invalid Invite</h1>
        <p className="text-sm text-muted-foreground">{errorMsg}</p>
        <button
          onClick={() => router.push('/leagues')}
          className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Go to My Leagues
        </button>
      </div>
    )
  }

  if (status === 'already') {
    return (
      <div className="max-w-sm w-full border rounded-xl p-8 text-center space-y-4">
        <div className="text-4xl">✅</div>
        <h1 className="text-lg font-semibold">Already a Member</h1>
        <p className="text-sm text-muted-foreground">You&apos;re already in <strong>{leagueName}</strong>.</p>
        <button
          onClick={goToLeague}
          className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Open League
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-sm w-full border rounded-xl p-8 text-center space-y-4">
      <div className="text-5xl">🎉</div>
      <h1 className="text-xl font-semibold">You&apos;re in!</h1>
      <p className="text-sm text-muted-foreground">
        Welcome to <strong>{leagueName}</strong>. Make your predictions before the tournament starts!
      </p>
      <button
        onClick={goToLeague}
        className="w-full px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
      >
        Go to League →
      </button>
    </div>
  )
}
