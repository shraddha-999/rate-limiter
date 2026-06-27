import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TokenBucketVizProps {
  burst?: number
  refillRate?: number
}

interface Token { id: number; status: 'available' | 'consumed' | 'blocked' }

export function TokenBucketViz({ burst = 5, refillRate = 1 }: TokenBucketVizProps) {
  const [tokens, setTokens] = useState(burst)
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<Array<{ id: number; allowed: boolean; tokens: number }>>([])
  const [reqId, setReqId] = useState(0)
  const [refilling, setRefilling] = useState(false)
  const tokenRef = useRef(tokens)
  tokenRef.current = tokens

  const reset = useCallback(() => {
    setTokens(burst)
    setRunning(false)
    setLog([])
    setReqId(0)
    setRefilling(false)
  }, [burst])

  // Refill tokens
  useEffect(() => {
    if (!running) return
    const interval = 1000 / refillRate
    const t = setInterval(() => {
      setTokens((prev) => {
        if (prev < burst) {
          setRefilling(true)
          setTimeout(() => setRefilling(false), 400)
          return Math.min(burst, prev + 1)
        }
        return prev
      })
    }, interval)
    return () => clearInterval(t)
  }, [running, refillRate, burst])

  // Send requests
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => {
      const cur = tokenRef.current
      const allowed = cur >= 1
      setLog((prev) => [
        { id: reqId, allowed, tokens: allowed ? cur - 1 : cur },
        ...prev,
      ].slice(0, 6))
      if (allowed) setTokens((t) => Math.max(0, t - 1))
      setReqId((i) => i + 1)
    }, 1200)
    return () => clearInterval(t)
  }, [running, reqId])

  const fillPct = (tokens / burst) * 100

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bucket */}
        <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Token Bucket</p>
            <div className="flex items-center gap-1.5">
              {refilling && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-success flex items-center gap-1"
                >
                  <Zap className="w-3 h-3" /> +1 token
                </motion.div>
              )}
            </div>
          </div>

          {/* Visual bucket */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-24 h-36 border-2 border-border rounded-b-2xl overflow-hidden bg-background">
              {/* Water fill */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 rounded-b-xl"
                animate={{
                  height: `${fillPct}%`,
                  backgroundColor: fillPct > 60 ? '#6366f1' : fillPct > 30 ? '#f59e0b' : '#ef4444',
                }}
                transition={{ duration: 0.3 }}
              >
                {/* Wave effect */}
                <motion.div
                  animate={{ x: [-4, 4, -4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-2 left-0 right-0 h-4 opacity-50"
                  style={{
                    background: 'radial-gradient(ellipse at center, white 0%, transparent 70%)',
                  }}
                />
              </motion.div>

              {/* Token count */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.span
                  key={tokens}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  className="text-2xl font-black text-white drop-shadow-md"
                >
                  {tokens}
                </motion.span>
              </div>
            </div>

            {/* Token slots */}
            <div className="flex gap-1.5">
              {Array.from({ length: burst }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: i === tokens - 1 && refilling ? [1, 1.3, 1] : 1,
                  }}
                  className={cn(
                    'w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold',
                    i < tokens
                      ? 'border-primary bg-primary/20 text-primary'
                      : 'border-border bg-transparent text-muted-foreground/20'
                  )}
                >
                  {i < tokens ? '●' : '○'}
                </motion.div>
              ))}
            </div>

            <div className="text-center text-xs text-muted-foreground space-y-0.5">
              <p>Capacity: <span className="text-foreground font-semibold">{burst}</span> tokens</p>
              <p>Refill: <span className="text-foreground font-semibold">{refillRate}/s</span></p>
            </div>
          </div>
        </div>

        {/* Request log */}
        <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3">
          <p className="text-sm font-semibold">Request Results</p>
          <div className="space-y-1.5 min-h-[180px]">
            <AnimatePresence>
              {log.map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono border',
                    r.allowed
                      ? 'bg-success/10 border-success/20 text-success'
                      : 'bg-destructive/10 border-destructive/20 text-destructive'
                  )}
                >
                  <span>{r.allowed ? '✓ ALLOWED' : '✗ BLOCKED (no tokens)'}</span>
                  <span className="text-muted-foreground">{r.tokens} left</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {!log.length && (
              <p className="text-xs text-muted-foreground text-center pt-10">Press Play to simulate</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-info/30 bg-info/5 p-4 text-sm">
        <p className="font-semibold text-info mb-1">💧 Natural Burst Handling</p>
        <p className="text-muted-foreground text-xs">
          The bucket starts full ({burst} tokens). A user can burst up to {burst} requests instantly,
          then is throttled to {refillRate} req/s. Perfect for APIs that need to allow short bursts
          while enforcing a long-term average rate.
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
