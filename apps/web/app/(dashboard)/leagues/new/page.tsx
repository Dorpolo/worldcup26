'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewLeaguePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)
      router.push(`/leagues/${data.data.slug}`)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    background: 'rgb(255 255 255 / 0.05)',
    border: '1px solid rgb(255 255 255 / 0.09)',
    borderRadius: '12px',
    color: 'rgb(240 235 227)',
    padding: '10px 14px',
    fontSize: '13px',
    outline: 'none',
    width: '100%',
  }

  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="w-full max-w-md space-y-6" style={{ animation: 'fade-in 0.3s ease' }}>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'rgb(240 235 227)' }}>Create a league</h1>
          <p className="text-[13px] mt-1" style={{ color: 'rgb(107 100 92)' }}>Invite friends and compete on World Cup predictions.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgb(107 100 92)' }}>
              League name *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. The Lads FC"
              required
              maxLength={60}
              style={inputStyle}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgb(107 100 92)' }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional…"
              maxLength={200}
              rows={3}
              style={{ ...inputStyle, resize: 'none' }}
            />
          </div>

          {error && <p className="text-[12px]" style={{ color: 'rgb(248 81 73)' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: 'rgb(217 119 87)', color: 'rgb(26 25 23)', border: 'none', cursor: loading || !name.trim() ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Creating…' : 'Create league'}
          </button>
        </form>
      </div>
    </div>
  )
}
