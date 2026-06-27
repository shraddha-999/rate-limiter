import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FixedWindowVizProps {
  limit?: number
  windowSeconds?: number
}

export function FixedWindowViz({ limit = 5, windowSeconds = 10 }: FixedWindowVizProps) {
  const [count, setCount] = useState(0)
  const [windowTime, setWindowTime] = useState(windowSeconds)
  const [running, setRunning] = useState(false)
  const [requests, setRequests] = useState<Array<{ id: number; allowed: boolean }>>([])
  const [reqId, setReqId] = useState(0)
  const [blocked, setBlocked] = useState(false)

  const reset = useCallback(() => {
    setCount(0)
    setWindowTime(windowSeconds)
    setRequests([])
    setReqId(0)
    setBlocked(false)
    setRunning(false)
  }, [windowSeconds])

  // Window countdown + reset
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => {
      setWindowTime((prev) => {
        if (prev <= 1) {
          setCount(0)
          setBlocked(false)
          return windowSeconds
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [running, windowSeconds])

  // Auto-send requests
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => {
      const allowed = count < limit
      setRequests((prev) => [{ id: reqId, allowed }, ...prev].slice(0, 8))
      setReqId((id) => id + 1)
      if (allowed) setCount((c) => c + 1)
      else setBlocked(true)
    }, 800)
    return () => clearInterval(t)
  }, [running, count, limit, reqId])

  const progressPct = (count / limit) * 100
  const timeProgressPct = ((windowSeconds - windowTime) / windowSeconds) * 100

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Window visualization */}
        <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Window #{Math.ceil((windowSeconds - windowTime + 0.001) / windowSeconds) || 1}</p>
              <p className="text-xs text-muted-foreground">{windowTime}s remaining</p>
            </div>
            <div className={cn(
              'px-3 py-1 rounded-full text-xs font-semibold',
              blocked ? 'bg-destructive/15 text-destructive' : 'bg-success/15 text-success'
            )}>
              {blocked ? 'LIMIT REACHED' : 'ACCEPTING'}
            </div>
          </div>

          {/* Counter slots */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Requests this window</span>
              <span className="font-mono font-bold text-foreground">{count} / {limit}</span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: limit }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: i === count - 1 ? [1.3, 1] : 1,
                    backgroundColor: i < count
                      ? blocked && i === limit - 1 ? '#ef4444' : '#6366f1'
                      : undefined,
                  }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xs font-bold transition-colors',
                    i < count
                      ? (blocked && i === limit - 1 ? 'border-destructive bg-destructive/20 text-destructive' : 'border-primary bg-primary/20 text-primary')
                      : 'border-border bg-transparent text-muted-foreground/30'
                  )}
                >
                  {i < count ? '✓' : i + 1}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Time progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Window progress</span>
              <span>{windowTime}s left</span>
            </div>
            <div className="h-2 bg-border rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-info rounded-full"
                animate={{ width: `${timeProgressPct}%` }}
                transition={{ duration: 0.9, ease: 'linear' }}
              />
            </div>
          </div>
        </div>

        {/* Request log */}
        <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground">Request Log</p>
          <div className="space-y-1.5 min-h-[160px]">
            <AnimatePresence>
              {requests.map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono',
                    r.allowed
                      ? 'bg-success/10 text-success border border-success/20'
                      : 'bg-destructive/10 text-destructive border border-destructive/20'
                  )}
                >
                  <span>{r.allowed ? '✓ ALLOWED' : '✗ BLOCKED'}</span>
                  <span className="text-muted-foreground">req #{r.id + 1}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {!requests.length && (
              <p className="text-xs text-muted-foreground text-center pt-8">Press Play to start the simulation</p>
            )}
          </div>
        </div>
      </div>

      {/* Issue callout */}
      <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm">
        <p className="font-semibold text-warning mb-1">⚠️ Boundary Burst Problem</p>
        <p className="text-muted-foreground text-xs">
          A client can send {limit} requests at the end of window N, then another {limit} at the start of window N+1.
          That's <strong className="text-warning">{limit * 2}× the intended rate</strong> in just 2 seconds.
          This is the key weakness of Fixed Window.
        </p>
      </div>

      {/* Controls */}
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
