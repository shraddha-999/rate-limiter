import axios, { type AxiosInstance, type AxiosError } from 'axios'
import { useAuthStore } from '@/store/authStore'

let apiInstance: AxiosInstance | null = null

export function createApiClient(baseURL?: string): AxiosInstance {
  const url = baseURL || import.meta.env.VITE_API_URL || 'http://localhost:8000'

  const instance = axios.create({
    baseURL: url,
    timeout: 10_000,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Inject auth headers on every request
  instance.interceptors.request.use((config) => {
    const { user } = useAuthStore.getState()
    if (user?.adminKey) {
      config.headers['X-Admin-Key'] = user.adminKey
    }
    if (user?.apiKey) {
      config.headers['X-API-Key'] = user.apiKey
    }
    return config
  })

  // Normalize errors
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const message = extractErrorMessage(error)
      return Promise.reject(new ApiError(message, error.response?.status ?? 0, error))
    }
  )

  return instance
}

export function getApiClient(): AxiosInstance {
  if (!apiInstance) {
    apiInstance = createApiClient()
  }
  return apiInstance
}

export function resetApiClient(baseURL: string): void {
  apiInstance = createApiClient(baseURL)
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly cause?: AxiosError
  ) {
    super(message)
    this.name = 'ApiError'
  }

  get isNotFound() { return this.status === 404 }
  get isUnauthorized() { return this.status === 401 }
  get isForbidden() { return this.status === 403 }
  get isRateLimited() { return this.status === 429 }
  get isServerError() { return this.status >= 500 }
  get isNetworkError() { return this.status === 0 }
}

function extractErrorMessage(error: AxiosError): string {
  if (!error.response) return 'Cannot connect to backend — is it running?'
  const data = error.response.data as Record<string, unknown> | undefined
  if (data?.message) return String(data.message)
  if (data?.detail) return String(data.detail)
  if (error.response.status === 429) return `Rate limit exceeded`
  if (error.response.status === 401) return 'Unauthorized — check your API key'
  if (error.response.status === 403) return 'Forbidden — identifier is blacklisted'
  if (error.response.status === 503) return 'Storage backend unavailable'
  return error.message || 'An unexpected error occurred'
}
