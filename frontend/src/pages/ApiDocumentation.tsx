import { useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check, ExternalLink, BookOpen } from 'lucide-react'
import { Header } from '@/components/shared/Header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied!')
  }
  return (
    <button onClick={copy} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function CodeBlock({ code, lang = 'bash' }: { code: string; lang?: string }) {
  return (
    <div className="relative rounded-lg bg-muted/50 border border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30">
        <span className="text-xs text-muted-foreground font-mono">{lang}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 text-xs font-mono text-foreground overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  )
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-success/15 text-success border-success/30',
  POST: 'bg-primary/15 text-primary border-primary/30',
  PUT: 'bg-warning/15 text-warning border-warning/30',
  DELETE: 'bg-destructive/15 text-destructive border-destructive/30',
}

interface EndpointProps {
  method: string
  path: string
  summary: string
  description: string
  auth?: string
  request?: string
  response: string
  curl: string
}

function Endpoint({ method, path, summary, description, auth, request, response, curl }: EndpointProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/20 transition-colors text-left"
      >
        <span className={`px-2 py-0.5 rounded text-xs font-bold border uppercase ${METHOD_COLORS[method]}`}>
          {method}
        </span>
        <code className="text-sm font-mono text-foreground">{path}</code>
        <span className="text-sm text-muted-foreground flex-1">{summary}</span>
        {auth && (
          <Badge variant="outline" className="text-xs shrink-0">{auth}</Badge>
        )}
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="border-t border-border"
        >
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">{description}</p>
            {request && (
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Request Body</p>
                <CodeBlock code={request} lang="json" />
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Response</p>
              <CodeBlock code={response} lang="json" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">cURL Example</p>
              <CodeBlock code={curl} lang="bash" />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export function ApiDocumentation() {
  const { backendUrl } = useAuthStore()
  const base = backendUrl || 'http://localhost:8000'

  const endpoints: EndpointProps[] = [
    {
      method: 'POST',
      path: '/rate-limit/check',
      summary: 'Check rate limit',
      description: 'Performs an atomic rate limit check. Returns 200 if allowed with remaining quota, or 429 with Retry-After if limit exceeded.',
      request: JSON.stringify({ identifier: 'user_42', identifier_type: 'user_id', endpoint: '/api/v1/search', algorithm: 'sliding_window', user_tier: 'free' }, null, 2),
      response: JSON.stringify({ allowed: true, identifier: 'user_42', identifier_type: 'user_id', remaining: 74, limit: 100, reset_after: 42, algorithm: 'sliding_window' }, null, 2),
      curl: `curl -X POST ${base}/rate-limit/check \\
  -H "Content-Type: application/json" \\
  -d '{"identifier":"user_42","identifier_type":"user_id"}'`,
    },
    {
      method: 'GET',
      path: '/config',
      summary: 'List all configurations',
      description: 'Returns all active (non-expired, enabled) rate limit rules.',
      response: JSON.stringify({ total: 2, configs: [{ id: 'abc123', algorithm: 'sliding_window', limit: 100, window_seconds: 60 }] }, null, 2),
      curl: `curl ${base}/config`,
    },
    {
      method: 'POST',
      path: '/config',
      summary: 'Create rate limit rule',
      description: 'Creates a new rate limiting rule. Takes effect immediately.',
      auth: 'X-Admin-Key',
      request: JSON.stringify({ identifier_type: 'user_id', identifier: '*', algorithm: 'sliding_window', limit: 100, window_seconds: 60, user_tier: 'free' }, null, 2),
      response: JSON.stringify({ id: 'abc123', identifier_type: 'user_id', identifier: '*', algorithm: 'sliding_window', limit: 100, window_seconds: 60, enabled: true, tags: [] }, null, 2),
      curl: `curl -X POST ${base}/config \\
  -H "X-Admin-Key: your-key" \\
  -H "Content-Type: application/json" \\
  -d '{"identifier_type":"user_id","identifier":"*","algorithm":"sliding_window","limit":100,"window_seconds":60}'`,
    },
    {
      method: 'PUT',
      path: '/config/{id}',
      summary: 'Update a rule (hot-reload)',
      description: 'Partially updates a rate limit rule. Changes take effect immediately, no restart needed.',
      auth: 'X-Admin-Key',
      request: JSON.stringify({ limit: 200, algorithm: 'token_bucket', refill_rate: 2.0, burst_capacity: 50 }, null, 2),
      response: JSON.stringify({ id: 'abc123', limit: 200, algorithm: 'token_bucket' }, null, 2),
      curl: `curl -X PUT ${base}/config/abc123 \\
  -H "X-Admin-Key: your-key" \\
  -H "Content-Type: application/json" \\
  -d '{"limit":200}'`,
    },
    {
      method: 'DELETE',
      path: '/config/{id}',
      summary: 'Delete a rule',
      description: 'Permanently removes a rate limit rule. Affected identifiers fall back to defaults.',
      auth: 'X-Admin-Key',
      response: '204 No Content',
      curl: `curl -X DELETE ${base}/config/abc123 \\
  -H "X-Admin-Key: your-key"`,
    },
    {
      method: 'GET',
      path: '/health',
      summary: 'Health check',
      description: 'Returns application health and storage connectivity. Use for liveness/readiness probes.',
      response: JSON.stringify({ status: 'healthy', storage_backend: 'redis', storage_healthy: true, version: '1.0.0', uptime_seconds: 3600.5 }, null, 2),
      curl: `curl ${base}/health`,
    },
    {
      method: 'GET',
      path: '/metrics',
      summary: 'Prometheus metrics',
      description: 'Exposes all collected Prometheus metrics in text format. Scrape with Prometheus at this endpoint.',
      response: `# HELP rate_limiter_requests_total Total number of rate limit check requests
# TYPE rate_limiter_requests_total counter
rate_limiter_requests_total{identifier_type="user_id",algorithm="sliding_window",endpoint="/"} 42.0`,
      curl: `curl ${base}/metrics`,
    },
  ]

  return (
    <div className="flex flex-col h-full">
      <Header title="API Documentation" subtitle="Complete reference for the Rate Limiter REST API" />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Header info */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Base URL</p>
                <code className="text-sm font-mono text-primary">{base}</code>
                <p className="text-xs text-muted-foreground mt-2">
                  Interactive docs available at <code className="bg-muted px-1 rounded">{base}/docs</code> (Swagger UI)
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={`${base}/docs`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" /> Swagger UI
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={`${base}/redoc`} target="_blank" rel="noopener noreferrer">
                    <BookOpen className="w-4 h-4" /> ReDoc
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auth */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Authentication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { header: 'X-Admin-Key', use: 'Required for POST/PUT/DELETE /config', env: 'ADMIN_API_KEY', variant: 'destructive' as const },
              { header: 'X-API-Key', use: 'Required for /rate-limit/check (if ALLOWED_API_KEYS is set)', env: 'ALLOWED_API_KEYS', variant: 'warning' as const },
            ].map(({ header, use, env, variant }) => (
              <div key={header} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                <Badge variant={variant}>{header}</Badge>
                <div>
                  <p className="text-xs text-foreground">{use}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Set via <code className="bg-muted px-1 rounded">{env}</code> env var</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Response headers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Rate Limit Response Headers</CardTitle>
            <CardDescription>Included on every /rate-limit/check response</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { header: 'X-RateLimit-Limit', desc: 'Maximum requests allowed in the window' },
                { header: 'X-RateLimit-Remaining', desc: 'Requests remaining in current window' },
                { header: 'X-RateLimit-Reset', desc: 'Seconds until the window resets' },
                { header: 'Retry-After', desc: 'Seconds to wait before retrying (only on 429)' },
              ].map(({ header, desc }) => (
                <div key={header} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <code className="text-xs font-mono text-primary shrink-0">{header}</code>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Endpoints */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Endpoints</h2>
          <div className="space-y-2">
            {endpoints.map((ep) => (
              <motion.div key={`${ep.method}-${ep.path}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Endpoint {...ep} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
