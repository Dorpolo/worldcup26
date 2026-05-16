'use client'

import { PointsProgressionChart, type MemberSeries } from '@/components/stats/PointsProgressionChart'
import { AccuracyBreakdownChart, type AccuracyEntry } from '@/components/stats/AccuracyBreakdownChart'

interface Props {
  progressionSeries: MemberSeries[]
  accuracyData: AccuracyEntry[]
}

const card = {
  background: 'rgb(var(--c-surface))',
  border: '1px solid rgb(var(--c-border-subtle))',
  borderRadius: '16px',
  padding: '16px',
}

const sectionLabel = {
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  color: 'rgb(var(--c-text-3))',
  marginBottom: '12px',
}

export function StatsCharts({ progressionSeries, accuracyData }: Props) {
  return (
    <div className="space-y-4">
      <section>
        <p style={sectionLabel}>Points Progression</p>
        <div style={card}>
          <PointsProgressionChart series={progressionSeries} />
        </div>
      </section>

      <section>
        <p style={sectionLabel}>Prediction Accuracy</p>
        <div style={card}>
          <AccuracyBreakdownChart data={accuracyData} />
        </div>
        <div className="flex gap-4 mt-2">
          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgb(var(--c-text-3))' }}>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgb(63 185 80)' }} />Exact
          </span>
          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgb(var(--c-text-3))' }}>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgb(99 155 255)' }} />Result
          </span>
          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgb(var(--c-text-3))' }}>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgb(var(--c-surface-3))' }} />Miss
          </span>
        </div>
      </section>
    </div>
  )
}
