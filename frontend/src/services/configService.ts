import { getApiClient } from './api'
import type {
  RateLimitConfig,
  ConfigListResponse,
  ConfigCreateRequest,
  ConfigUpdateRequest,
} from '@/types'

export async function listConfigs(): Promise<ConfigListResponse> {
  const { data } = await getApiClient().get<ConfigListResponse>('/config')
  return data
}

export async function getConfig(id: string): Promise<RateLimitConfig> {
  const { data } = await getApiClient().get<RateLimitConfig>(`/config/${id}`)
  return data
}

export async function createConfig(payload: ConfigCreateRequest): Promise<RateLimitConfig> {
  const { data } = await getApiClient().post<RateLimitConfig>('/config', payload)
  return data
}

export async function updateConfig(
  id: string,
  payload: ConfigUpdateRequest
): Promise<RateLimitConfig> {
  const { data } = await getApiClient().put<RateLimitConfig>(`/config/${id}`, payload)
  return data
}

export async function deleteConfig(id: string): Promise<void> {
  await getApiClient().delete(`/config/${id}`)
}
