export const APP_NAME = 'RateGuard'
export const APP_VERSION = '1.0.0'

export const ALGORITHMS = [
  { value: 'fixed_window', label: 'Fixed Window', color: '#6366f1' },
  { value: 'sliding_window', label: 'Sliding Window', color: '#8b5cf6' },
  { value: 'token_bucket', label: 'Token Bucket', color: '#06b6d4' },
] as const

export const IDENTIFIER_TYPES = [
  { value: 'user_id', label: 'User ID' },
  { value: 'api_key', label: 'API Key' },
  { value: 'ip_address', label: 'IP Address' },
  { value: 'endpoint', label: 'Endpoint' },
] as const

export const USER_TIERS = [
  { value: 'free', label: 'Free', color: 'text-muted-foreground', limit: 100 },
  { value: 'premium', label: 'Premium', color: 'text-warning', limit: 1000 },
  { value: 'enterprise', label: 'Enterprise', color: 'text-primary', limit: 999999 },
] as const

export const ALGORITHM_DESCRIPTIONS = {
  fixed_window: {
    name: 'Fixed Window',
    summary: 'Divides time into fixed intervals. Each window has its own counter.',
    pros: ['Simple and efficient', 'O(1) space', 'Minimal Redis operations'],
    cons: ['Burst at window edges (2× spike)', 'Not perfectly smooth'],
    complexity: 'O(1)',
    storage: 'Hash',
  },
  sliding_window: {
    name: 'Sliding Window Log',
    summary: 'Tracks each request timestamp in a sorted set. Window slides continuously.',
    pros: ['No boundary burst problem', 'Perfectly smooth limiting', 'Accurate'],
    cons: ['O(n) memory per key', 'Higher Redis overhead'],
    complexity: 'O(log n)',
    storage: 'Sorted Set',
  },
  token_bucket: {
    name: 'Token Bucket',
    summary: 'Bucket fills with tokens at a fixed rate. Each request consumes one token.',
    pros: ['Natural burst handling', 'Smooth average rate', 'Flexible'],
    cons: ['More complex state', 'Two Redis fields per key'],
    complexity: 'O(1)',
    storage: 'Hash {tokens, last_refill}',
  },
}

export const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/simulator', label: 'Request Simulator', icon: 'Play' },
  { path: '/configurations', label: 'Configurations', icon: 'Settings2' },
  { path: '/algorithms', label: 'Algorithm Visualizer', icon: 'GitBranch' },
  { path: '/redis', label: 'Redis Inspector', icon: 'Database' },
  { path: '/metrics', label: 'Metrics', icon: 'BarChart2' },
  { path: '/logs', label: 'Logs', icon: 'ScrollText' },
  { path: '/api-docs', label: 'API Docs', icon: 'BookOpen' },
  { path: '/settings', label: 'Settings', icon: 'SlidersHorizontal' },
]

export const CHART_COLORS = {
  allowed: '#10b981',
  blocked: '#ef4444',
  total: '#6366f1',
  latency: '#f59e0b',
  redis: '#06b6d4',
  p50: '#8b5cf6',
  p99: '#f43f5e',
  primary: '#6366f1',
  secondary: '#8b5cf6',
}

export const DEFAULT_SIMULATOR_CONFIG = {
  identifier: 'user-001',
  identifier_type: 'user_id' as const,
  endpoint: '/api/v1/data',
  algorithm: undefined,
  user_tier: undefined,
  limit: 10,
  window_seconds: 60,
  burst_capacity: 5,
  refill_rate: 0.5,
  num_requests: 20,
  delay_ms: 100,
}

export const DEMO_CONFIG = {
  adminKey: 'change-me-in-production',
  apiKey: '',
  backendUrl: 'http://localhost:8000',
}

export const HTTP_STATUS_LABELS: Record<number, string> = {
  200: 'OK',
  429: 'Too Many Requests',
  401: 'Unauthorized',
  403: 'Forbidden',
  503: 'Service Unavailable',
}
