import { useState } from 'react'
import { motion } from 'framer-motion'
import { GitBranch, Info } from 'lucide-react'
import { Header } from '@/components/shared/Header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FixedWindowViz } from '@/components/algorithms/FixedWindowViz'
import { SlidingWindowViz } from '@/components/algorithms/SlidingWindowViz'
import { TokenBucketViz } from '@/components/algorithms/TokenBucketViz'
import { LeakyBucketViz } from '@/components/algorithms/LeakyBucketViz'
import { ALGORITHM_DESCRIPTIONS } from '@/constants'

const TABS = [
  { id: 'fixed_window', label: 'Fixed Window', color: 'bg-indigo-500' },
  { id: 'sliding_window', label: 'Sliding Window', color: 'bg-purple-500' },
  { id: 'token_bucket', label: 'Token Bucket', color: 'bg-cyan-500' },
  { id: 'leaky_bucket', label: 'Leaky Bucket', color: 'bg-emerald-500' },
]

const leakyDesc = {
  name: 'Leaky Bucket',
  summary: 'Requests fill a FIFO queue that drains at a constant rate. Overflow is dropped.',
  pros: ['Perfectly constant output rate', 'Great for traffic shaping', 'Prevents burst processing'],
  cons: ['May increase latency for burst traffic', 'No burst absorption'],
  complexity: 'O(1)',
  storage: 'Queue + counter',
}

export function AlgorithmVisualizer() {
  const [activeTab, setActiveTab] = useState('fixed_window')

  const desc = activeTab === 'leaky_bucket'
    ? leakyDesc
    : ALGORITHM_DESCRIPTIONS[activeTab as keyof typeof ALGORITHM_DESCRIPTIONS]

  return (
    <div className="flex flex-col h-full">
      <Header title="Algorithm Visualizer" subtitle="Interactive animations explaining each rate limiting algorithm" />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-auto p-1 gap-1">
            {TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="gap-2">
                <span className={`w-2 h-2 rounded-full ${t.color}`} />
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Algorithm description */}
          {desc && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-primary" />
                        {desc.name}
                      </CardTitle>
                      <CardDescription className="mt-1 text-sm">{desc.summary}</CardDescription>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {desc.complexity} time
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {desc.storage}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-success mb-2">✅ Pros</p>
                      <ul className="space-y-1">
                        {desc.pros.map((p) => (
                          <li key={p} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <span className="text-success mt-0.5">•</span> {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-destructive mb-2">⚠️ Cons</p>
                      <ul className="space-y-1">
                        {desc.cons.map((c) => (
                          <li key={c} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <span className="text-destructive mt-0.5">•</span> {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Visualizations */}
          <TabsContent value="fixed_window">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Fixed Window Simulation</CardTitle>
                <CardDescription>Shared counter per time slot. Resets at window boundaries.</CardDescription>
              </CardHeader>
              <CardContent>
                <FixedWindowViz limit={5} windowSeconds={10} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sliding_window">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Sliding Window Log Simulation</CardTitle>
                <CardDescription>Each request timestamp tracked in a sorted set.</CardDescription>
              </CardHeader>
              <CardContent>
                <SlidingWindowViz limit={5} windowSeconds={10} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="token_bucket">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Token Bucket Simulation</CardTitle>
                <CardDescription>Bucket refills at a fixed rate. Each request consumes one token.</CardDescription>
              </CardHeader>
              <CardContent>
                <TokenBucketViz burst={5} refillRate={0.5} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaky_bucket">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Leaky Bucket Simulation</CardTitle>
                <CardDescription>FIFO queue drains at constant rate. Overflow is dropped.</CardDescription>
              </CardHeader>
              <CardContent>
                <LeakyBucketViz capacity={8} leakRate={1} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Comparison table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              Algorithm Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {['Algorithm', 'Burst Handling', 'Memory', 'Boundary Burst', 'Best For'].map((h) => (
                      <th key={h} className="text-left pb-2 pr-4 text-muted-foreground font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { algo: 'Fixed Window', burst: '2× at edges', mem: 'O(1)', boundary: '⚠️ Yes', best: 'Simple APIs, counters' },
                    { algo: 'Sliding Window', burst: 'None', mem: 'O(n)', boundary: '✅ No', best: 'Strict fairness, login' },
                    { algo: 'Token Bucket', burst: 'Up to capacity', mem: 'O(1)', boundary: '✅ No', best: 'API with burst needs' },
                    { algo: 'Leaky Bucket', burst: 'Queued only', mem: 'O(n)', boundary: '✅ No', best: 'Network traffic shaping' },
                  ].map((r) => (
                    <tr key={r.algo} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 pr-4 font-semibold text-foreground">{r.algo}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{r.burst}</td>
                      <td className="py-2.5 pr-4 font-mono text-muted-foreground">{r.mem}</td>
                      <td className="py-2.5 pr-4">{r.boundary}</td>
                      <td className="py-2.5 text-muted-foreground">{r.best}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
