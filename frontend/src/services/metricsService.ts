import { getApiClient } from './api'
import { parsePrometheusMetrics } from '@/lib/utils'
import type { HealthResponse, MetricsSnapshot, PrometheusMetrics } from '@/types'

export async function getHealth(): Promise<HealthResponse> {
  const { data } = await getApiClient().get<HealthResponse>('/health')
  return data
}

export async function getMetrics(): Promise<PrometheusMetrics> {
  const { data } = await getApiClient().get<string>('/metrics', {
    headers: { Accept: 'text/plain' },
    responseType: 'text',
  })

  const raw = parsePrometheusMetrics(data)

  const parsed: MetricsSnapshot = {
    timestamp: Date.now(),
    requests_total: raw['rate_limiter_requests_total'] || 0,
    requests_allowed: raw['rate_limiter_requests_allowed_total'] || 0,
    requests_blocked: raw['rate_limiter_requests_blocked_total'] || 0,
    redis_errors: raw['rate_limiter_redis_errors_total'] || 0,
    active_identifiers: raw['rate_limiter_active_identifiers'] || 0,
    request_latency_p50: raw['rate_limiter_request_duration_seconds'] || 0,
    redis_latency_avg: raw['rate_limiter_redis_operation_duration_seconds'] || 0,
  }

  return { raw, parsed }
}
