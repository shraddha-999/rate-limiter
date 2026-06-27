import { useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Trash2, Search, Database, AlertCircle } from 'lucide-react'
import { Header } from '@/components/shared/Header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

// Mock data representing what Redis keys would look like
// The backend doesn't expose a Redis key listing endpoint, so this
// shows simulated data based on the key patterns the algorithms use.
const MOCK_KEYS = [
  { key: 'rl:config-1:user-001', value: '{"tokens": 4.2, "last_refill": 1719403200}', ttl: 47, type: 'hash', algo: 'token_bucket' },
  { key: 'rl:config-2:192.168.1.1', value: '{"1719403140": 3}', ttl: 12, type: 'hash', algo: 'fixed_window' },
  { key: 'rl:config-3:api-key-abc', value: '[1719403180.1, 1719403185.4, 1719403192.7]', ttl: 55, type: 'zset', algo: 'sliding_window' },
  { key: 'rl:config-1:user-002', value: '{"tokens": 0.0, "last_refill": 1719403199}', ttl: 110, type: 'hash', algo: 'token_bucket' },
  { key: 'rl:config-2:10.0.0.1', value: '{"1719403140": 10}', ttl: 3, type: 'hash', algo: 'fixed_window' },
  { key: 'rl:__config__', value: '{"configs": [...]}', ttl: -1, type: 'string', algo: 'config' },
]

export function RedisInspector() {
  const [search, setSearch] = useState('')
  const [keys, setKeys] = useState(MOCK_KEYS)

  const filtered = keys.filter((k) =>
    k.key.toLowerCase().includes(search.toLowerCase())
  )

  const typeColor: Record<string, string> = {
    hash: 'text-info',
    zset: 'text-primary',
    string: 'text-warning',
    list: 'text-success',
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Redis Inspector" subtitle="Inspect live rate limiter keys in Redis" />

      <div className="flex-1 overflow-auto p-6 space-y-4">
        {/* Warning banner */}
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 flex items-start gap-2.5 text-xs">
          <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-warning">Simulated View</p>
            <p className="text-muted-foreground mt-0.5">
              The backend doesn't expose a Redis key listing endpoint. This view shows the key patterns
              and data formats that the rate limiter writes to Redis. Add a <code className="bg-muted px-1 rounded">GET /redis/keys</code> endpoint
              to your backend to show live data.
            </p>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Keys', value: keys.length, color: 'text-foreground' },
            { label: 'Hash Keys', value: keys.filter(k => k.type === 'hash').length, color: 'text-info' },
            { label: 'Sorted Sets', value: keys.filter(k => k.type === 'zset').length, color: 'text-primary' },
            { label: 'Expiring Soon', value: keys.filter(k => k.ttl > 0 && k.ttl < 30).length, color: 'text-warning' },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-3">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Key browser */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="w-4 h-4" /> Key Browser
                </CardTitle>
                <CardDescription>Pattern: <code className="bg-muted px-1 rounded text-xs">rl:{'<config_id>'}:{'<identifier>'}</code></CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search keys..."
                    className="pl-8 h-8 text-xs w-48"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                  <RefreshCw className="w-4 h-4" /> Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Algorithm</TableHead>
                  <TableHead>Value Preview</TableHead>
                  <TableHead>TTL</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((k, i) => (
                  <motion.tr
                    key={k.key}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border hover:bg-muted/20 transition-colors"
                  >
                    <TableCell className="font-mono text-xs text-foreground">{k.key}</TableCell>
                    <TableCell>
                      <span className={`font-mono text-xs font-semibold ${typeColor[k.type] || 'text-foreground'}`}>
                        {k.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {k.algo.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground max-w-[200px] truncate">
                      {k.value}
                    </TableCell>
                    <TableCell>
                      {k.ttl === -1 ? (
                        <span className="text-xs text-muted-foreground">∞ persist</span>
                      ) : (
                        <span className={`text-xs font-mono ${k.ttl < 30 ? 'text-warning' : 'text-muted-foreground'}`}>
                          {k.ttl}s
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="hover:text-destructive"
                          onClick={() => setKeys((ks) => ks.filter((k2) => k2.key !== k.key))}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Key pattern reference */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Redis Key Patterns Reference</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                pattern: 'rl:<config_id>:<identifier>',
                algo: 'fixed_window',
                structure: 'HASH { "<window_start>": count }',
                ttl: 'window_seconds × 2',
              },
              {
                pattern: 'rl:<config_id>:<identifier>',
                algo: 'sliding_window',
                structure: 'ZSET { "<timestamp>-<uuid>": timestamp }',
                ttl: 'window_seconds + 1',
              },
              {
                pattern: 'rl:<config_id>:<identifier>',
                algo: 'token_bucket',
                structure: 'HASH { "tokens": float, "last_refill": timestamp }',
                ttl: 'ceil(burst / refill_rate) + 10',
              },
            ].map((r) => (
              <div key={r.algo} className="rounded-lg border border-border p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{r.pattern}</code>
                  <Badge variant="secondary" className="text-xs">{r.algo.replace('_', ' ')}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Structure: <code className="bg-muted px-1 rounded">{r.structure}</code></p>
                <p className="text-xs text-muted-foreground">TTL: {r.ttl}s</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
