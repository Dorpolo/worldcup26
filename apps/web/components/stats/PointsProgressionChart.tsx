'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export interface MemberSeries {
  userId: string
  name: string
  isMe: boolean
  data: Array<{ matchLabel: string; cumulative: number }>
}

interface Props {
  series: MemberSeries[]
}

// Distinct palette — first colour is bolder for "me"
const COLOURS = [
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#f97316', // orange
  '#14b8a6', // teal
  '#ec4899', // pink
  '#84cc16', // lime
]

export function PointsProgressionChart({ series }: Props) {
  if (series.length === 0 || series.every((s) => s.data.length === 0)) {
    return (
      <div className="flex items-center justify-center h-48 text-sm" style={{ color: 'rgb(107 100 92)' }}>
        Points progression will appear once matches are scored.
      </div>
    )
  }

  // Merge all match labels into one ordered list and fill gaps
  const allLabels = Array.from(
    new Set(series.flatMap((s) => s.data.map((d) => d.matchLabel)))
  )

  const chartData = allLabels.map((label) => {
    const row: Record<string, string | number> = { label }
    for (const s of series) {
      const point = s.data.find((d) => d.matchLabel === label)
      row[s.name] = point?.cumulative ?? null!
    }
    return row
  })

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(255 255 255 / 0.06)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: 'rgb(107 100 92)' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'rgb(107 100 92)' }}
          tickLine={false}
          axisLine={false}
          width={32}
        />
        <Tooltip
          contentStyle={{
            background: 'rgb(36 34 32)',
            border: '1px solid rgb(255 255 255 / 0.1)',
            borderRadius: 8,
            fontSize: 12,
            color: 'rgb(240 235 227)',
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: 'rgb(107 100 92)' }} />
        {series.map((s, i) => (
          <Line
            key={s.userId}
            type="monotone"
            dataKey={s.name}
            stroke={COLOURS[i % COLOURS.length]}
            strokeWidth={s.isMe ? 3 : 1.5}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
