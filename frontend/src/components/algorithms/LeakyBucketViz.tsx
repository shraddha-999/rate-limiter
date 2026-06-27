import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw, Droplets } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LeakyBucketVizProps {
  capacity?: number
  leakRate?: number
}

export function LeakyBucketViz({ capacity = 8, leakRate = 1 }: LeakyBucketVizProps) {
  const [queue, setQueue] = useState(0)
  const [running, setRunning] = useState(false)
  const [processed, setProcessed] = useState(0)
  const [dropped, setDropped] = useState(0)
  const [leaking, setLeaking] = useState(false)

  const reset = useCallback(() => {
    setQueue(0)
    setRunning(false)
    setProcessed(0)
    setDropped(0)
    setLeaking(false)
  }, [])

  // Leak (process) requests at fixed rate
  useEffect(() => {
    if (!running) return
    const interval = 1000 / leakRate
    const t = setInterval(() => {
      setQueue((q) => {
        if (q > 0) {
          setLeaking(true)
          setTimeout(() => setLeaking(false), 400)
          setProcessed((p) => p + 1)
          return q - 1
        }
        return q
      })
    }, interval)
    return () => clearInterval(t)
  }, [running, leakRate])

  // Receive incoming requests
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => {
      setQueue((q) => {
        if (q < capacity) return q + 1
        setDropped((d) => d + 1)
        return q
      })
    }, 600)
    return () => clearInterval(t)
  }, [running, capacity])

  const fillPct = (queue / capacity) * 100

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bucket */}
        <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4">
          <p className="text-sm font-semibold">Leaky Bucket (FIFO Queue)</p>

          <div className="flex flex-col items-center gap-4">
            {/* Incoming arrow */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Incoming requests →</span>
              <motion.div
                animate={{ opacity: running ? [1, 0.3, 1] : 1 }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-primary"
              />
            </div>

            {/* Bucket */}
            <div className="relative w-28 h-40 border-2 border-border rounded-b-3xl overflow-hidden bg-background">
              <motion.div
                className="absolute bottom-0 left-0 right-0"
                animate={{
                  height: `${fillPct}%`,
                  backgroundColor: fillPct > 80 ? '#ef4444' : fillPct > 50 ? '#f59e0b' : '#06b6d4',
                }}
                transition={{ duration: 0.3 }}
              >
                {/* Ripple */}
                <motion.div
                  animate={{ scaleX: [1, 1.05, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="absolute top-0 left-0 right-0 h-2 bg-white/10 rounded-full"
                />
              </motion.div>
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.span key={queue} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="text-2xl font-black text-white drop-shadow">
                  {queue}
                </motion.span>
              </div>
            </div>

            {/* Leak at bottom */}
            <div className="flex flex-col items-center gap-1">
              <AnimatePresence>
                {leaking && (
                  <motion.div
                    key={processed}
                    initial={{ opacity: 1, y: 0 }}
                    animate={{ opacity: 0, y: 24 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="text-info"
                  >
                    <Droplets className="w-4 h-4" />
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>Leak: {leakRate}/s</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4">
          <p className="text-sm font-semibold">Stats</p>
          <div className="space-y-3">
            {[
              { label: 'Queue size', value: `${queue} / ${capacity}`, color: 'text-info' },
              { label: 'Processed (leaked)', value: processed, color: 'text-success' },
              { label: 'Dropped (overflow)', value: dropped, color: 'text-destructive' },
              { label: 'Throughput', value: `${leakRate} req/s`, color: 'text-primary' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className={cn('text-sm font-bold font-mono', color)}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-info/30 bg-info/5 p-4 text-sm">
        <p className="font-semibold text-info mb-1">🚰 Constant Output Rate</p>
        <p className="text-muted-foreground text-xs">
          Leaky Bucket processes requests at a <strong className="text-info">constant rate</strong> regardless of burst.
          Excess requests queue up; if the queue is full, new requests are dropped immediately.
          Output is perfectly smooth — ideal for network traffic shaping.
        </p>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={() => setRunning((r) => !r)}>
          {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {running ? 'Pause' : 'Play'}
        </Button>
        <Button size="sm" variant="outline" onClick={reset}>
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
      </div>
    </div>
  )
}
