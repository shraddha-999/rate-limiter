import { getApiClient, ApiError } from './api'
import type { RateLimitCheckRequest, RateLimitCheckResponse } from '@/types'

export async function checkRateLimit(
  request: RateLimitCheckRequest
): Promise<{ data: RateLimitCheckResponse; status: number; responseTime: number }> {
  const client = getApiClient()
  const start = performance.now()

  try {
    const response = await client.post<RateLimitCheckResponse>('/rate-limit/check', request)
    const responseTime = performance.now() - start
    return { data: response.data, status: response.status, responseTime }
  } catch (error) {
    const responseTime = performance.now() - start
    if (error instanceof ApiError && error.isRateLimited) {
      const data = error.cause?.response?.data as { message: string; retry_after: number }
      return {
        data: {
          allowed: false,
          identifier: request.identifier,
          identifier_type: request.identifier_type,
          remaining: 0,
          limit: 0,
          reset_after: data?.retry_after || 0,
          algorithm: request.algorithm || 'unknown',
        },
        status: 429,
        responseTime,
      }
    }
    throw error
  }
}
