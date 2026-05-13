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
      <div className="text-center space-y-4" style={{ animation: 'fade-in 0.4s ease' }}>
        <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center" style={{ background: 'rgb(217 119 87 / 0.12)' }}>
          <span className="text-2xl" style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>⚽</span>
        </div>
        <p className="text-sm" style={{ color: 'rgb(160 152 144)' }}>Joining league…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div
        className="max-w-sm w-full rounded-2xl p-8 text-center space-y-5"
        style={{
          background: 'rgb(36 34 32)',
          border: '1px solid rgb(255 255 255 / 0.08)',
          animation: 'fade-in 0.4s ease',
        }}
      >
        <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-2xl" style={{ background: 'rgb(248 81 73 / 0.1)' }}>
          ✕
        </div>
        <div className="space-y-1.5">
          <h1 className="text-base font-semibold" style={{ color: 'rgb(240 235 227)' }}>Invalid Invite</h1>
          <p className="text-sm" style={{ color: 'rgb(107 100 92)' }}>{errorMsg}</p>
        </div>
        <button
          onClick={() => router.push('/leagues')}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'rgb(255 255 255 / 0.07)', color: 'rgb(160 152 144)' }}
        >
          Go to My Leagues
        </button>
      </div>
    )
  }

  if (status === 'already') {
    return (
      <div
        className="max-w-sm w-full rounded-2xl p-8 text-center space-y-5"
        style={{
          background: 'rgb(36 34 32)',
          border: '1px solid rgb(255 255 255 / 0.08)',
          animation: 'fade-in 0.4s ease',
        }}
      >
        <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-2xl" style={{ background: 'rgb(217 119 87 / 0.1)' }}>
          ◈
        </div>
        <div className="space-y-1.5">
          <h1 className="text-base font-semibold" style={{ color: 'rgb(240 235 227)' }}>Already a Member</h1>
          <p className="text-sm" style={{ color: 'rgb(107 100 92)' }}>
            You&apos;re already in <span style={{ color: 'rgb(217 119 87)' }}>{leagueName}</span>.
          </p>
        </div>
        <button
          onClick={goToLeague}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'rgb(217 119 87)', color: 'rgb(26 25 23)' }}
        >
          Open League →
        </button>
      </div>
    )
  }

  return (
    <div
      className="max-w-sm w-full rounded-2xl p-8 text-center space-y-5"
      style={{
        background: 'rgb(36 34 32)',
        border: '1px solid rgb(217 119 87 / 0.2)',
        animation: 'fade-in 0.4s ease',
      }}
    >
      <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-2xl" style={{ background: 'rgb(217 119 87 / 0.12)' }}>
        🎉
      </div>
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold" style={{ color: 'rgb(240 235 227)' }}>You&apos;re in!</h1>
        <p className="text-sm" style={{ color: 'rgb(107 100 92)' }}>
          Welcome to <span style={{ color: 'rgb(217 119 87)' }}>{leagueName}</span>. Make your predictions before the matches kick off!
        </p>
      </div>
      <button
        onClick={goToLeague}
        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
        style={{ background: 'rgb(217 119 87)', color: 'rgb(26 25 23)' }}
      >
        Go to League →
      </button>
    </div>
  )
}
