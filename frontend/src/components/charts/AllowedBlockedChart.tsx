import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { CHART_COLORS } from '@/constants'
import { formatNumber } from '@/lib/utils'

interface Props {
  allowed: number
  blocked: number
  height?: number
}

const RADIAN = Math.PI / 180

const renderCustomLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}: any) => {
  if (percent < 0.05) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="600">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function AllowedBlockedChart({ allowed, blocked, height = 240 }: Props) {
  const total = allowed + blocked
  const data = [
    { name: 'Allowed', value: allowed },
    { name: 'Blocked', value: blocked },
  ]

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            labelLine={false}
            label={renderCustomLabel}
          >
            <Cell fill={CHART_COLORS.allowed} stroke="transparent" />
            <Cell fill={CHART_COLORS.blocked} stroke="transparent" />
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'hsl(var(--foreground))',
            }}
            formatter={(value: number, name: string) => [formatNumber(value), name]}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '4px' }}
            formatter={(value) => <span style={{ color: 'hsl(var(--muted-foreground))' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: '-16px' }}>
        <p className="text-xl font-bold text-foreground">{formatNumber(total)}</p>
        <p className="text-xs text-muted-foreground">Total</p>
      </div>
    </div>
  )
}
