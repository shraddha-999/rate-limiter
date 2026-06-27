import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { RefreshCw, Activity, Database, Clock, BarChart2 } from 'lucide-react'
import { Header } from '@/components/shared/Header'
import { MetricCard } from '@/components/shared/MetricCard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getMetrics } from '@/services/metricsService'
import { useSettingsStore } from '@/store/settingsStore'
import { formatNumber, formatDuration } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { CHART_COLORS } from '@/constants'

export function Metrics() {
  const { refreshInterval } = useSettingsStore()
  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ['metrics-full'],
    queryFn: getMetrics,
    refetchInterval: refreshInterval,
  })

  const snap = data?.parsed
  const raw = data?.raw

  // Build metric items from raw Prometheus data
  const rawEntries = raw
    ? Object.entries(raw).filter(([k]) => k.startsWith('rate_limiter_'))
    : []

  return (
    <div className="flex flex-col h-full">
      <Header title="Metrics" subtitle="Live Prometheus metrics from your rate limiter" />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Prometheus</Badge>
            <span className="text-xs text-muted-foreground">Refreshing every {Math.round(refreshInterval / 1000)}s</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-center">
              <p className="text-destructive font-medium">Failed to load metrics</p>
              <p className="text-muted-foreground text-sm mt-1">
                Make sure the backend is running at the configured URL
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Key metric cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  title: 'Total Requests',
                  value: snap ? formatNumber(snap.requests_total) : '—',
                  icon: <Activity className="w-4 h-4" />,
                  variant: 'default' as const,
                  subtitle: 'all time',
                },
                {
                  title: 'Allowed',
                  value: snap ? formatNumber(snap.requests_allowed) : '—',
                  icon: <BarChart2 className="w-4 h-4" />,
                  variant: 'success' as const,
                  subtitle: snap?.requests_total
                    ? `${((snap.requests_allowed / snap.requests_total) * 100).toFixed(1)}%`
                    : '—',
                },
                {
                  title: 'Blocked',
                  value: snap ? formatNumber(snap.requests_blocked) : '—',
                  icon: <BarChart2 className="w-4 h-4" />,
                  variant: 'danger' as const,
                  subtitle: snap?.requests_total
                    ? `${((snap.requests_blocked / snap.requests_total) * 100).toFixed(1)}%`
                    : '—',
                },
                {
                  title: 'Redis Errors',
                  value: snap ? formatNumber(snap.redis_errors) : '0',
                  icon: <Database className="w-4 h-4" />,
                  variant: (snap?.redis_errors ?? 0) > 0 ? 'danger' as const : 'success' as const,
                  subtitle: 'operation failures',
                },
              ].map((c) => (
                <MetricCard key={c.title} {...c} loading={isLoading} />
              ))}
            </div>

            {/* Chart: request breakdown */}
            {snap && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Request Distribution</CardTitle>
                  <CardDescription>Total vs Allowed vs Blocked (cumulative)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={[
                        { name: 'Total', value: snap.requests_total },
                        { name: 'Allowed', value: snap.requests_allowed },
                        { name: 'Blocked', value: snap.requests_blocked },
                        { name: 'Redis Errors', value: snap.redis_errors },
                      ]}
                      margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Bar
                        dataKey="value"
                        fill={CHART_COLORS.primary}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Raw metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Raw Prometheus Metrics</CardTitle>
                <CardDescription>
                  Parsed from <code className="bg-muted px-1 rounded text-xs">GET /metrics</code>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : rawEntries.length ? (
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {rawEntries.map(([key, value]) => (
                      <motion.div
                        key={key}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/20 transition-colors"
                      >
                        <code className="text-xs font-mono text-muted-foreground truncate max-w-[75%]">{key}</code>
                        <span className="text-xs font-mono font-bold text-foreground shrink-0">{formatNumber(value)}</span>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm">No metrics yet — make some requests first</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
