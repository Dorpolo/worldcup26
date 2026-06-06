'use client'

import { useState, useEffect } from 'react'
import { Loader2, TrendingUp, Info } from 'lucide-react'

interface Props {
  matchId: string
  leagueId: string
  homeTeam: string
  awayTeam: string
  status: string
  className?: string
}

interface MarketData {
  available: boolean
  probabilities?: {
    homeWin: number
    draw: number
    awayWin: number
  }
  volume?: number
  lastUpdated?: string
  pollyMarketUrl?: string
  reason?: string
}

export function MarketProbabilitiesBar({ matchId, leagueId, homeTeam, awayTeam, status, className }: Props) {
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    // Only fetch for unfulfilled matches (scheduled/locked)
    if (status === 'finished' || status === 'live') return

    const fetchMarketData = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/leagues/${leagueId}/matches/${matchId}/market-data`)
        const json = await res.json()
        if (json.ok) {
          setMarketData(json.data)
        } else {
          setError('Market data unavailable')
        }
      } catch (err) {
        setError('Failed to fetch market data')
      } finally {
        setLoading(false)
      }
    }

    fetchMarketData()
  }, [matchId, leagueId, status])

  if (status === 'finished' || status === 'live') {
    return null
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center gap-1 text-[10px] ${className}`}>
        <Loader2 className="w-3 h-3 animate-spin" />
        <span style={{ color: 'rgb(var(--c-text-3))' }}>Loading market…</span>
      </div>
    )
  }

  if (error || !marketData) {
    return null
  }

  if (!marketData.available) {
    if (marketData.pollyMarketUrl) {
      return (
        <div className="relative">
          <a
            href={marketData.pollyMarketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors hover:opacity-75 relative group"
            style={{ color: 'rgb(var(--c-text-3))', background: 'rgb(var(--c-overlay-xs))' }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <TrendingUp className="w-3 h-3" />
            <span>View Polly Market →</span>
            <Info className="w-2.5 h-2.5 opacity-50" />
          </a>

          {/* Hover tooltip with probabilities */}
          {showTooltip && (
            <div
              className="absolute bottom-full left-0 mb-2 p-2 rounded-lg text-[9px] whitespace-nowrap z-50 pointer-events-none animate-in fade-in"
              style={{
                background: 'rgb(var(--c-bg))',
                border: '1px solid rgb(var(--c-border-normal))',
                color: 'rgb(var(--c-text-2))'
              }}
            >
              <p className="font-semibold mb-1">Market Probabilities:</p>
              <p>🟢 {homeTeam}: {marketData.probabilities ? Math.round(marketData.probabilities.homeWin) : '?'}%</p>
              <p>⚪ Draw: {marketData.probabilities ? Math.round(marketData.probabilities.draw) : '?'}%</p>
              <p>🔴 {awayTeam}: {marketData.probabilities ? Math.round(marketData.probabilities.awayWin) : '?'}%</p>
            </div>
          )}
        </div>
      )
    }
    return null
  }

  const probs = marketData.probabilities
  if (!probs) return null

  const homeWinPct = Math.round(probs.homeWin)
  const drawPct = Math.round(probs.draw)
  const awayWinPct = Math.round(probs.awayWin)

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Title */}
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'rgb(var(--c-text-3))' }}>
          Market Odds
        </p>
        {marketData.pollyMarketUrl && (
          <a
            href={marketData.pollyMarketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] px-1.5 py-0.5 rounded transition-colors hover:opacity-75"
            style={{ color: 'rgb(217 119 87)', background: 'rgb(217 119 87 / 0.1)' }}
            title="Bet on Polly Market"
          >
            Polly →
          </a>
        )}
      </div>

      {/* Probability bars */}
      <div className="grid grid-cols-3 gap-1.5">
        {/* Home Win */}
        <div className="space-y-1">
          <div className="w-full h-1.5 rounded-sm overflow-hidden" style={{ background: 'rgb(var(--c-border-subtle))' }}>
            <div
              className="h-full rounded-sm transition-all"
              style={{
                width: `${homeWinPct}%`,
                background: 'rgb(63 185 80)',
              }}
            />
          </div>
          <div className="text-center">
            <p className="text-[8px] font-semibold" style={{ color: 'rgb(var(--c-text-2))' }}>
              {homeWinPct}%
            </p>
            <p className="text-[7px]" style={{ color: 'rgb(var(--c-text-3))' }}>
              {homeTeam}
            </p>
          </div>
        </div>

        {/* Draw */}
        <div className="space-y-1">
          <div className="w-full h-1.5 rounded-sm overflow-hidden" style={{ background: 'rgb(var(--c-border-subtle))' }}>
            <div
              className="h-full rounded-sm transition-all"
              style={{
                width: `${drawPct}%`,
                background: 'rgb(155 155 155)',
              }}
            />
          </div>
          <div className="text-center">
            <p className="text-[8px] font-semibold" style={{ color: 'rgb(var(--c-text-2))' }}>
              {drawPct}%
            </p>
            <p className="text-[7px]" style={{ color: 'rgb(var(--c-text-3))' }}>
              Draw
            </p>
          </div>
        </div>

        {/* Away Win */}
        <div className="space-y-1">
          <div className="w-full h-1.5 rounded-sm overflow-hidden" style={{ background: 'rgb(var(--c-border-subtle))' }}>
            <div
              className="h-full rounded-sm transition-all"
              style={{
                width: `${awayWinPct}%`,
                background: 'rgb(248 81 73)',
              }}
            />
          </div>
          <div className="text-center">
            <p className="text-[8px] font-semibold" style={{ color: 'rgb(var(--c-text-2))' }}>
              {awayWinPct}%
            </p>
            <p className="text-[7px]" style={{ color: 'rgb(var(--c-text-3))' }}>
              {awayTeam}
            </p>
          </div>
        </div>
      </div>

      {/* Volume info */}
      {marketData.volume && (
        <p className="text-[8px]" style={{ color: 'rgb(var(--c-text-3))' }}>
          Volume: ${(marketData.volume / 1000000).toFixed(1)}M
        </p>
      )}
    </div>
  )
}
