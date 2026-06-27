import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Download, Trash2, ScrollText, CheckCircle2, XCircle } from 'lucide-react'
import { Header } from '@/components/shared/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useLogsStore } from '@/store/logsStore'
import { downloadCSV } from '@/lib/utils'
import toast from 'react-hot-toast'

const PAGE_SIZE = 50

export function Logs() {
  const { logs, clear } = useLogsStore()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'allowed' | 'blocked'>('all')
  const [page, setPage] = useState(1)

  const filtered = logs.filter((l) => {
    const matchSearch =
      l.user.includes(search) ||
      l.endpoint.includes(search) ||
      l.algorithm.includes(search)
    const matchFilter =
      filter === 'all' ||
      (filter === 'allowed' && l.allowed) ||
      (filter === 'blocked' && !l.allowed)
    return matchSearch && matchFilter
  })

  const pages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const exportLogs = () => {
    downloadCSV(filtered as unknown as Record<string, unknown>[], 'rateguard-logs')
    toast.success(`Exported ${filtered.length} log entries`)
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Logs" subtitle="Request history from the simulator" />

      <div className="flex-1 overflow-auto p-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Logs', value: logs.length, icon: <ScrollText className="w-4 h-4" />, color: 'text-foreground' },
            { label: 'Allowed', value: logs.filter(l => l.allowed).length, icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-success' },
            { label: 'Blocked', value: logs.filter(l => !l.allowed).length, icon: <XCircle className="w-4 h-4" />, color: 'text-destructive' },
          ].map(({ label, value, icon, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <div className={color}>{icon}</div>
                <div>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search user, endpoint..."
                className="pl-8 h-8 text-xs w-56"
              />
            </div>
            {(['all', 'allowed', 'blocked'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1) }}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors capitalize ${
                  filter === f
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportLogs} disabled={!filtered.length}>
              <Download className="w-4 h-4" /> Export
            </Button>
            <Button variant="outline" size="sm" onClick={clear} disabled={!logs.length} className="hover:text-destructive">
              <Trash2 className="w-4 h-4" /> Clear
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User / Identifier</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Algorithm</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Latency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {paginated.map((log) => (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`border-b border-border text-xs ${
                          log.allowed ? 'row-success' : 'row-blocked'
                        }`}
                      >
                        <TableCell className="font-mono text-muted-foreground">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </TableCell>
                        <TableCell className="font-mono font-medium">{log.user}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">{log.endpoint}</TableCell>
                        <TableCell>
                          <span className={`flex items-center gap-1 font-semibold ${log.allowed ? 'text-success' : 'text-destructive'}`}>
                            {log.allowed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {log.allowed ? 'allowed' : 'blocked'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {log.algorithm.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{log.remaining}</TableCell>
                        <TableCell className="font-mono">{log.execution_time_ms.toFixed(1)}ms</TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>

            {!paginated.length && (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <ScrollText className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-muted-foreground text-sm">No logs yet</p>
                <p className="text-xs text-muted-foreground">Run simulations to populate the log</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {pages} ({filtered.length} entries)
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}>
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
