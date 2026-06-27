import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Square, RotateCcw, Download, Filter,
  CheckCircle2, XCircle, Loader2, ChevronUp, ChevronDown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Header } from '@/components/shared/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { checkRateLimit } from '@/services/rateLimitService'
import { useLogsStore } from '@/store/logsStore'
import { downloadCSV, generateId, sleep, formatDuration } from '@/lib/utils'
import { ALGORITHMS, IDENTIFIER_TYPES, USER_TIERS, DEFAULT_SIMULATOR_CONFIG } from '@/constants'
import type { SimulatorConfig, SimulatorResult } from '@/types'

type SortField = keyof SimulatorResult
type SortDir = 'asc' | 'desc'
type FilterStatus = 'all' | 'allowed' | 'blocked' | 'error'

export function RequestSimulator() {
  const { addFromSimulatorResult } = useLogsStore()
  const [config, setConfig] = useState<SimulatorConfig>(DEFAULT_SIMULATOR_CONFIG)
  const [results, setResults] = useState<SimulatorResult[]>([])
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'request_number', dir: 'asc' })
  const stopRef = useRef(false)

  const set = (k: keyof SimulatorConfig, v: unknown) =>
    setConfig((c) => ({ ...c, [k]: v }))

  const runRequests = useCallback(async (n: number) => {
    if (running) return
    stopRef.current = false
    setRunning(true)
    setProgress(0)
    setResults([])

    let completed = 0
    for (let i = 0; i < n; i++) {
      if (stopRef.current) break

      const result = await (async (): Promise<SimulatorResult> => {
        try {
          const { data, status, responseTime } = await checkRateLimit({
            identifier: config.identifier,
            identifier_type: config.identifier_type,
            endpoint: config.endpoint,
            algorithm: config.algorithm,
            user_tier: config.user_tier,
          })
          return {
            id: generateId(),
            request_number: i + 1,
            timestamp: new Date().toISOString(),
            status: data.allowed ? 'allowed' : 'blocked',
            http_code: status,
            remaining: data.remaining,
            retry_after: data.reset_after,
            response_time_ms: responseTime,
            algorithm: data.algorithm,
            identifier: data.identifier,
          }
        } catch (err: unknown) {
          return {
            id: generateId(),
            request_number: i + 1,
            timestamp: new Date().toISOString(),
            status: 'error',
            http_code: (err as { status?: number })?.status || 0,
            remaining: 0,
            retry_after: 0,
            response_time_ms: 0,
            algorithm: config.algorithm || 'unknown',
            identifier: config.identifier,
          }
        }
      })()

      setResults((prev) => [...prev, result])
      addFromSimulatorResult(result)
      completed++
      setProgress(Math.round((completed / n) * 100))

      if (config.delay_ms > 0 && i < n - 1) {
        await sleep(config.delay_ms)
      }
    }

    setRunning(false)
    const allowed = results.filter((r) => r.status === 'allowed').length + (completed > 0 ? 1 : 0)
    toast.success(`Simulation complete: ${completed} requests sent`)
  }, [running, config, addFromSimulatorResult])

  const stop = () => {
    stopRef.current = true
    setRunning(false)
  }

  const reset = () => {
    setResults([])
    setProgress(0)
    setRunning(false)
    stopRef.current = true
  }

  const exportCSV = () => {
    downloadCSV(results as unknown as Record<string, unknown>[], 'simulator-results')
    toast.success('Results exported')
  }

  const toggleSort = (field: SortField) => {
    setSort((s) => ({
      field,
      dir: s.field === field ? (s.dir === 'asc' ? 'desc' : 'asc') : 'asc',
    }))
  }

  const filtered = results
    .filter((r) => filter === 'all' || r.status === filter)
    .sort((a, b) => {
      const av = a[sort.field]
      const bv = b[sort.field]
      const cmp = (av as number) < (bv as number) ? -1 : (av as number) > (bv as number) ? 1 : 0
      return sort.dir === 'asc' ? cmp : -cmp
    })

  const allowed = results.filter((r) => r.status === 'allowed').length
  const blocked = results.filter((r) => r.status === 'blocked').length
  const avgMs = results.length
    ? results.reduce((s, r) => s + r.response_time_ms, 0) / results.length
    : 0

  const SortIcon = ({ field }: { field: SortField }) =>
    sort.field === field ? (
      sort.dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
    ) : null

  return (
    <div className="flex flex-col h-full">
      <Header title="Request Simulator" subtitle="Fire real requests against your rate limiter" />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Config panel */}
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm">Simulation Config</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Identifier</Label>
                <Input value={config.identifier} onChange={(e) => set('identifier', e.target.value)} placeholder="user-001" />
              </div>

              <div className="space-y-1.5">
                <Label>Identifier Type</Label>
                <Select value={config.identifier_type} onValueChange={(v) => set('identifier_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {IDENTIFIER_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Endpoint</Label>
                <Input value={config.endpoint} onChange={(e) => set('endpoint', e.target.value)} placeholder="/api/v1/data" />
              </div>

              <div className="space-y-1.5">
                <Label>Algorithm Override <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Select value={config.algorithm || 'default'} onValueChange={(v) => set('algorithm', v === 'default' ? undefined : v)}>
                  <SelectTrigger><SelectValue placeholder="Use config default" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Use config default</SelectItem>
                    {ALGORITHMS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>User Tier <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Select value={config.user_tier || 'none'} onValueChange={(v) => set('user_tier', v === 'none' ? undefined : v)}>
                  <SelectTrigger><SelectValue placeholder="No tier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No tier</SelectItem>
                    {USER_TIERS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Requests</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10000}
                    value={config.num_requests}
                    onChange={(e) => set('num_requests', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Delay (ms)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={10000}
                    value={config.delay_ms}
                    onChange={(e) => set('delay_ms', Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button onClick={() => runRequests(config.num_requests)} disabled={running} className="col-span-2">
                  {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {running ? 'Running...' : `Send ${config.num_requests}`}
                </Button>
                {[10, 100, 1000].map((n) => (
                  <Button
                    key={n}
                    variant="outline"
                    size="sm"
                    onClick={() => runRequests(n)}
                    disabled={running}
                  >
                    Send {n}
                  </Button>
                ))}
                {running ? (
                  <Button variant="destructive" size="sm" onClick={stop}>
                    <Square className="w-4 h-4" /> Stop
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={reset}>
                    <RotateCcw className="w-4 h-4" /> Reset
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results panel */}
          <div className="xl:col-span-2 space-y-4">
            {/* Progress */}
            {running && (
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-mono">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </CardContent>
              </Card>
            )}

            {/* Stats */}
            {results.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Allowed', value: allowed, icon: <CheckCircle2 className="w-4 h-4" />, cls: 'text-success' },
                  { label: 'Blocked', value: blocked, icon: <XCircle className="w-4 h-4" />, cls: 'text-destructive' },
                  { label: 'Avg Latency', value: `${avgMs.toFixed(1)}ms`, icon: null, cls: 'text-info' },
                ].map(({ label, value, icon, cls }) => (
                  <Card key={label}>
                    <CardContent className="pt-4 pb-3 text-center">
                      <div className={`flex items-center justify-center gap-1 text-xl font-bold ${cls}`}>
                        {icon}{value}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Table toolbar */}
            {results.length > 0 && (
              <Card>
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-muted-foreground" />
                      {(['all', 'allowed', 'blocked', 'error'] as FilterStatus[]).map((f) => (
                        <button
                          key={f}
                          onClick={() => setFilter(f)}
                          className={`text-xs px-2.5 py-1 rounded-full transition-colors capitalize ${
                            filter === f
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          }`}
                        >
                          {f} {f !== 'all' && `(${results.filter((r) => r.status === f).length})`}
                        </button>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" onClick={exportCSV}>
                      <Download className="w-4 h-4" /> Export CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="rounded-lg border border-border overflow-hidden">
                    <div className="overflow-auto max-h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {[
                              { key: 'request_number', label: '#' },
                              { key: 'timestamp', label: 'Time' },
                              { key: 'status', label: 'Status' },
                              { key: 'http_code', label: 'Code' },
                              { key: 'remaining', label: 'Remaining' },
                              { key: 'retry_after', label: 'Reset In' },
                              { key: 'response_time_ms', label: 'Latency' },
                            ].map(({ key, label }) => (
                              <TableHead
                                key={key}
                                className="cursor-pointer select-none hover:text-foreground"
                                onClick={() => toggleSort(key as SortField)}
                              >
                                <span className="flex items-center gap-1">
                                  {label}
                                  <SortIcon field={key as SortField} />
                                </span>
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <AnimatePresence>
                            {filtered.map((r) => (
                              <motion.tr
                                key={r.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className={`border-b border-border text-xs ${
                                  r.status === 'allowed'
                                    ? 'row-success'
                                    : r.status === 'blocked'
                                    ? 'row-blocked'
                                    : ''
                                }`}
                              >
                                <TableCell className="font-mono">{r.request_number}</TableCell>
                                <TableCell className="font-mono text-muted-foreground">
                                  {new Date(r.timestamp).toLocaleTimeString()}
                                </TableCell>
                                <TableCell>
                                  <span className={`inline-flex items-center gap-1 font-semibold ${
                                    r.status === 'allowed' ? 'text-success' : 'text-destructive'
                                  }`}>
                                    {r.status === 'allowed' ? '✓' : '✗'} {r.status}
                                  </span>
                                </TableCell>
                                <TableCell className="font-mono">{r.http_code}</TableCell>
                                <TableCell className="font-mono">{r.remaining}</TableCell>
                                <TableCell className="font-mono">{r.retry_after}s</TableCell>
                                <TableCell className="font-mono">{r.response_time_ms.toFixed(1)}ms</TableCell>
                              </motion.tr>
                            ))}
                          </AnimatePresence>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  {filtered.length === 0 && results.length > 0 && (
                    <p className="text-center text-muted-foreground text-sm py-6">No results match this filter</p>
                  )}
                </CardContent>
              </Card>
            )}

            {!results.length && !running && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-64 gap-3">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <Play className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">Configure and run a simulation to see results</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
