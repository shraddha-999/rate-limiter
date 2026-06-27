// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  name: string
  email: string
  role: 'admin' | 'viewer'
  adminKey: string
  apiKey: string
}

export interface LoginCredentials {
  name: string
  adminKey: string
  apiKey?: string
  backendUrl: string
}

// ── Rate Limit ────────────────────────────────────────────────────────────────

export type Algorithm = 'fixed_window' | 'sliding_window' | 'token_bucket'
export type IdentifierType = 'user_id' | 'api_key' | 'ip_address' | 'endpoint'
export type UserTier = 'free' | 'premium' | 'enterprise'

export interface RateLimitCheckRequest {
  identifier: string
  identifier_type: IdentifierType
  endpoint?: string
  algorithm?: Algorithm
  user_tier?: UserTier
}

export interface RateLimitCheckResponse {
  allowed: boolean
  identifier: string
  identifier_type: string
  remaining: number
  limit: number
  reset_after: number
  algorithm: string
}

export interface RateLimitError {
  message: string
  retry_after?: number
}

// ── Config ────────────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  id: string
  identifier_type: string
  identifier: string
  algorithm: string
  limit: number
  window_seconds: number
  burst_capacity: number
  refill_rate: number
  user_tier: string | null
  endpoint: string | null
  enabled: boolean
  expires_at: number | null
  tags: string[]
}

export interface ConfigCreateRequest {
  identifier_type: IdentifierType
  identifier: string
  algorithm: Algorithm
  limit: number
  window_seconds: number
  burst_capacity?: number
  refill_rate?: number
  user_tier?: UserTier | null
  endpoint?: string | null
  enabled?: boolean
  expires_in_seconds?: number | null
  tags?: string[]
}

export interface ConfigUpdateRequest {
  algorithm?: Algorithm
  limit?: number
  window_seconds?: number
  burst_capacity?: number
  refill_rate?: number
  user_tier?: UserTier | null
  endpoint?: string | null
  enabled?: boolean
  expires_in_seconds?: number | null
  tags?: string[]
}

export interface ConfigListResponse {
  total: number
  configs: RateLimitConfig[]
}

// ── Health ────────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  storage_backend: string
  storage_healthy: boolean
  version: string
  uptime_seconds: number
}

// ── Metrics ───────────────────────────────────────────────────────────────────

export interface MetricsSnapshot {
  timestamp: number
  requests_total: number
  requests_allowed: number
  requests_blocked: number
  request_latency_p50?: number
  request_latency_p99?: number
  redis_errors: number
  redis_latency_avg?: number
  active_identifiers?: number
}

export interface PrometheusMetrics {
  raw: Record<string, number>
  parsed: MetricsSnapshot
}

// ── Request Simulator ─────────────────────────────────────────────────────────

export interface SimulatorConfig {
  identifier: string
  identifier_type: IdentifierType
  endpoint: string
  algorithm?: Algorithm
  user_tier?: UserTier
  limit: number
  window_seconds: number
  burst_capacity: number
  refill_rate: number
  num_requests: number
  delay_ms: number
}

export interface SimulatorResult {
  id: string
  request_number: number
  timestamp: string
  status: 'allowed' | 'blocked' | 'error'
  http_code: number
  remaining: number
  retry_after: number
  response_time_ms: number
  algorithm: string
  identifier: string
}

// ── Logs ──────────────────────────────────────────────────────────────────────

export interface LogEntry {
  id: string
  timestamp: string
  user: string
  endpoint: string
  allowed: boolean
  algorithm: string
  remaining: number
  execution_time_ms: number
  identifier_type: string
  user_tier?: string
}

// ── Redis Inspector ───────────────────────────────────────────────────────────

export interface RedisKey {
  key: string
  value: string
  ttl: number
  type: string
  created_at?: string
  last_updated?: string
}

// ── App Settings ──────────────────────────────────────────────────────────────

export interface AppSettings {
  theme: 'dark' | 'light' | 'system'
  accentColor: string
  refreshInterval: number
  backendUrl: string
  sidebarCollapsed: boolean
  compactMode: boolean
  animationsEnabled: boolean
}

// ── Chart data ────────────────────────────────────────────────────────────────

export interface TimeSeriesPoint {
  time: string
  value: number
  timestamp: number
}

export interface RequestsChartPoint {
  time: string
  allowed: number
  blocked: number
  total: number
}

export interface LatencyChartPoint {
  time: string
  p50: number
  p99: number
  avg: number
}
