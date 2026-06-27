import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Request {
  id: number
  ts: number
  allowed: boolean
}

interface SlidingWindowVizProps {
  limit?: number
  windowSeconds?: number
}

export function SlidingWindowViz({ limit = 5, windowSeconds = 10 }: SlidingWindowVizProps) {
  const [requests, setRequests] = useState<Request[]>([])
  const [running, setRunning] = useState(false)
  const [now, setNow] = useState(0)
  const [reqId, setReqId] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  const reset = useCallback(() => {
    setRequests([])
    setRunning(false)
    setNow(0)
    setReqId(0)
    setElapsed(0)
  }, [])

  // Advance clock
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => {
      setNow((prev) => prev + 1)
      setElapsed((e) => e + 1)
    }, 500)
    return () => clearInterval(t)
  }, [running])

  // Send requests
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => {
      setRequests((prev) => {
        const cutoff = now - windowSeconds
        const active = prev.filter((r) => r.ts > cutoff)
        const allowed = active.length < limit
        const newReq: Request = { id: reqId, ts: now, allowed }
        return [...active, newReq].slice(-20)
      })
      setReqId((i) => i + 1)
    }, 900)
    return () => clearInterval(t)
  }, [running, now, limit, windowSeconds, reqId])

  const cutoff = now - windowSeconds
  const activeReqs = requests.filter((r) => r.ts > cutoff)
  const timelineWidth = 320

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Sliding Window</p>
            <p className="text-xs text-muted-foreground">Rolling {windowSeconds}s window</p>
          </div>
          <div className={cn(
            'px-3 py-1 rounded-full text-xs font-semibold',
            activeReqs.length >= limit ? 'bg-destructive/15 text-destructive' : 'bg-success/15 text-success'
          )}>
            {activeReqs.length} / {limit} slots used
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          <p className="text-xs text-muted-foreground mb-2">Timeline (last {windowSeconds}s)</p>
          <div className="relative h-12 bg-border/40 rounded-lg overflow-hidden">
            {/* Window indicator */}
            <div className="absolute inset-0 flex">
              <div className="flex-1 border-r-2 border-primary/50 bg-primary/5" />
            </div>
            {/* Requests */}
            {requests.map((r) => {
              const age = now - r.ts
              if (age > windowSeconds) return null
              const pct = 100 - (age / windowSeconds) * 100
              return (
                <motion.div
                  key={r.id}
                  initial={{ scale: 1.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1, x: `${pct}%` }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    'absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold shadow-md',
                    r.allowed
                      ? 'bg-success text-white'
                      : 'bg-destructive text-white'
                  )}
                  style={{ left: `${pct}%`, transform: `translateX(-50%) translateY(-50%)`, top: '50%' }}
                >
                  {r.allowed ? '✓' : '✗'}
                </motion.div>
              )
            })}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>-{windowSeconds}s</span>
            <span className="text-primary font-medium">now</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'In Window', value: activeReqs.length, color: 'text-primary' },
            { label: 'Allowed', value: activeReqs.filter(r => r.allowed).length, color: 'text-success' },
            { label: 'Blocked', value: activeReqs.filter(r => !r.allowed).length, color: 'text-destructive' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center p-3 rounded-lg bg-background/50 border border-border">
              <p className={cn('text-xl font-bold', color)}>{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Advantage callout */}
      <div className="rounded-lg border border-success/30 bg-success/5 p-4 text-sm">
        <p className="font-semibold text-success mb-1">✅ No Boundary Burst</p>
        <p className="text-muted-foreground text-xs">
          The window slides continuously — at any point in time, only {limit} requests in the last {windowSeconds}s are allowed.
          No double-spend at window edges. Trade-off: O(n) memory per identifier.
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
