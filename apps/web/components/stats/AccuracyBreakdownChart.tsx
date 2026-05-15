'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'

export interface AccuracyEntry {
  name: string
  exact: number
  result: number
  miss: number
  isMe: boolean
}

interface Props {
  data: AccuracyEntry[]
}

export function AccuracyBreakdownChart({ data }: Props) {
  if (data.length === 0 || data.every((d) => d.exact + d.result + d.miss === 0)) {
    return (
      <div className="flex items-center justify-center h-48 text-sm" style={{ color: 'rgb(var(--c-text-3))' }}>
        Accuracy breakdown will appear once matches are scored.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
        barSize={28}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(var(--c-border-soft))" />
        <XAxis
          dataKey="name"
          tick={({ x, y, payload }) => (
            <text
              x={x}
              y={y + 12}
              textAnchor="middle"
              fontSize={11}
              fill={data.find((d) => d.name === payload.value)?.isMe ? 'rgb(217 119 87)' : 'rgb(var(--c-text-3))'}
              fontWeight={data.find((d) => d.name === payload.value)?.isMe ? 700 : 400}
            >
              {payload.value}
            </text>
          )}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: 'rgb(var(--c-text-3))' }}
          tickLine={false}
          axisLine={false}
          width={28}
        />
        <Tooltip
          contentStyle={{
            background: 'rgb(var(--c-surface))',
            border: '1px solid rgb(var(--c-border-normal))',
            borderRadius: 8,
            fontSize: 12,
            color: 'rgb(var(--c-text-1))',
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: 'rgb(var(--c-text-3))' }} />
        <Bar dataKey="exact" name="Exact score" stackId="a" fill="rgb(63 185 80)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="result" name="Correct result" stackId="a" fill="rgb(99 155 255)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="miss" name="Miss" stackId="a" fill="rgb(var(--c-surface-3))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
