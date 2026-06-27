import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Activity, CheckCircle2, XCircle, Users, Database,
  Cpu, Clock, Zap, TrendingUp,
} from 'lucide-react'
import { Header } from '@/components/shared/Header'
import { MetricCard } from '@/components/shared/MetricCard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RequestsOverTimeChart } from '@/components/charts/RequestsOverTimeChart'
import { AllowedBlockedChart } from '@/components/charts/AllowedBlockedChart'
import { LatencyHistogramChart } from '@/components/charts/LatencyHistogramChart'
import { getMetrics, getHealth } from '@/services/metricsService'
import { listConfigs } from '@/services/configService'
import { formatNumber, formatUptime, getTimeLabel } from '@/lib/utils'
import { useSettingsStore } from '@/store/settingsStore'
import type { RequestsChartPoint, LatencyChartPoint, MetricsSnapshot } from '@/types'

const MAX_HISTORY = 20

function useMetricsHistory(refreshInterval: number) {
  const historyRef = useRef<MetricsSnapshot[]>([])
  const [chartData, setChartData] = useState<{
    requests: RequestsChartPoint[]
    latency: LatencyChartPoint[]
  }>({ requests: [], latency: [] })

  const { data: metrics } = useQuery({
    queryKey: ['metrics'],
    queryFn: getMetrics,
    refetchInterval: refreshInterval,
  })

  useEffect(() => {
    if (!metrics) return
    const snap = metrics.parsed
    historyRef.current = [...historyRef.current, snap].slice(-MAX_HISTORY)

    const prev = historyRef.current[historyRef.current.length - 2]
    const time = getTimeLabel(new Date())

    setChartData((cd) => {
      const requests: RequestsChartPoint = {
        time,
        total: prev ? snap.requests_total - prev.requests_total : 0,
        allowed: prev ? snap.requests_allowed - prev.requests_allowed : 0,
        blocked: prev ? snap.requests_blocked - prev.requests_blocked : 0,
      }
      const latency: LatencyChartPoint = {
        time,
        avg: (snap.request_latency_p50 || 0) * 1000,
        p99: (snap.request_latency_p50 || 0) * 3 * 1000,
        p50: (snap.request_latency_p50 || 0) * 1000,
      }
      return {
        requests: [...cd.requests, requests].slice(-MAX_HISTORY),
        latency: [...cd.latency, latency].slice(-MAX_HISTORY),
      }
    })
  }, [metrics])

  return { metrics, chartData }
}

export function Dashboard() {
  const { refreshInterval } = useSettingsStore()
  const { metrics, chartData } = useMetricsHistory(refreshInterval)

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: refreshInterval,
  })

  const { data: configs } = useQuery({
    queryKey: ['configs'],
    queryFn: listConfigs,
    refetchInterval: 30_000,
  })

  const snap = metrics?.parsed
  const isHealthy = health?.status === 'healthy'

  const cards = [
    {
      title: 'Total Requests',
      value: snap ? formatNumber(snap.requests_total) : '—',
      icon: <Activity className="w-4 h-4" />,
      variant: 'default' as const,
      subtitle: 'lifetime cumulative',
      delay: 0,
    },
    {
      title: 'Allowed Requests',
      value: snap ? formatNumber(snap.requests_allowed) : '—',
      icon: <CheckCircle2 className="w-4 h-4" />,
      variant: 'success' as const,
      subtitle: snap && snap.requests_total > 0
        ? `${((snap.requests_allowed / snap.requests_total) * 100).toFixed(1)}% pass rate`
        : 'no requests yet',
      delay: 0.05,
    },
    {
      title: 'Blocked Requests',
      value: snap ? formatNumber(snap.requests_blocked) : '—',
      icon: <XCircle className="w-4 h-4" />,
      variant: 'danger' as const,
      subtitle: snap && snap.requests_total > 0
        ? `${((snap.requests_blocked / snap.requests_total) * 100).toFixed(1)}% block rate`
        : 'no requests yet',
      delay: 0.1,
    },
    {
      title: 'Active Configs',
      value: configs?.total ?? '—',
      icon: <Cpu className="w-4 h-4" />,
      variant: 'default' as const,
      subtitle: 'rate limit rules',
      delay: 0.15,
    },
    {
      title: 'Redis Status',
      value: health?.status === 'healthy' ? 'Online' : health?.status === 'degraded' ? 'Degraded' : '—',
      icon: <Database className="w-4 h-4" />,
      variant: isHealthy ? 'success' as const : 'danger' as const,
      subtitle: health ? `${health.storage_backend} backend` : 'checking...',
      delay: 0.2,
    },
    {
      title: 'Uptime',
      value: health ? formatUptime(health.uptime_seconds) : '—',
      icon: <Clock className="w-4 h-4" />,
      variant: 'info' as const,
      subtitle: `v${health?.version || '—'}`,
      delay: 0.25,
    },
    {
      title: 'Redis Errors',
      value: snap ? formatNumber(snap.redis_errors) : '0',
      icon: <Zap className="w-4 h-4" />,
      variant: (snap?.redis_errors ?? 0) > 0 ? 'danger' as const : 'success' as const,
      subtitle: 'operation errors',
      delay: 0.3,
    },
    {
      title: 'Avg Latency',
      value: snap?.request_latency_p50
        ? `${(snap.request_latency_p50 * 1000).toFixed(1)}ms`
        : '—',
      icon: <TrendingUp className="w-4 h-4" />,
      variant: 'info' as const,
      subtitle: 'rate limit check',
      delay: 0.35,
    },
  ]

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Dashboard"
        subtitle="Real-time overview of your rate limiting platform"
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map((card) => (
            <MetricCard
              key={card.title}
              title={card.title}
              value={card.value}
              icon={card.icon}
              variant={card.variant}
              subtitle={card.subtitle}
              delay={card.delay}
              loading={!metrics && !health}
            />
          ))}
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Requests Over Time</CardTitle>
                  <CardDescription>Allowed vs Blocked (per interval)</CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Live · {Math.round(refreshInterval / 1000)}s
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <RequestsOverTimeChart data={chartData.requests} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Traffic Split</CardTitle>
              <CardDescription>Allowed vs Blocked ratio</CardDescription>
            </CardHeader>
            <CardContent>
              <AllowedBlockedChart
                allowed={snap?.requests_allowed ?? 0}
                blocked={snap?.requests_blocked ?? 0}
              />
            </CardContent>
          </Card>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Response Latency</CardTitle>
              <CardDescription>Average & P99 check latency</CardDescription>
            </CardHeader>
            <CardContent>
              <LatencyHistogramChart data={chartData.latency} />
            </CardContent>
          </Card>

          {/* Active configs table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Active Rate Limit Rules</CardTitle>
              <CardDescription>{configs?.total ?? 0} rules configured</CardDescription>
            </CardHeader>
            <CardContent>
              {configs?.configs.length ? (
                <div className="space-y-2">
                  {configs.configs.slice(0, 5).map((c) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 text-xs"
                    >
                      <div>
                        <p className="font-medium text-foreground truncate max-w-[160px]">
                          {c.identifier === '*' ? 'All ' + c.identifier_type : c.identifier}
                        </p>
                        <p className="text-muted-foreground">{c.algorithm.replace('_', ' ')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-foreground">{c.limit}</p>
                        <p className="text-muted-foreground">/{c.window_seconds}s</p>
                      </div>
                    </motion.div>
                  ))}
                  {configs.configs.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      +{configs.configs.length - 5} more rules
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <p className="text-muted-foreground text-sm">No configs yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Go to Configurations to add rate limit rules
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* System info */}
        {health && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex flex-wrap gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Version: </span>
                <span className="font-mono text-foreground">{health.version}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Backend: </span>
                <span className="font-mono text-foreground">{health.storage_backend}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Storage: </span>
                <span className={health.storage_healthy ? 'text-success' : 'text-destructive'}>
                  {health.storage_healthy ? '● connected' : '● disconnected'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Uptime: </span>
                <span className="font-mono text-foreground">{formatUptime(health.uptime_seconds)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Refresh: </span>
                <span className="font-mono text-foreground">every {Math.round(refreshInterval / 1000)}s</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
