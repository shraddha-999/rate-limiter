import { resetApiClient } from './api'
import { getHealth } from './metricsService'
import type { LoginCredentials, AuthUser } from '@/types'

export async function login(credentials: LoginCredentials): Promise<AuthUser> {
  // Reconfigure the API client with the new backend URL
  resetApiClient(credentials.backendUrl)

  // Temporarily set the admin key for the health check
  const tempHeaders: Record<string, string> = {}
  if (credentials.adminKey) {
    tempHeaders['X-Admin-Key'] = credentials.adminKey
  }

  // Test connectivity
  const health = await getHealth()
  if (health.status === 'unhealthy') {
    throw new Error('Backend is unhealthy — Redis may be down')
  }

  const user: AuthUser = {
    name: credentials.name,
    email: `${credentials.name.toLowerCase().replace(/\s+/g, '.')}@rateguard.io`,
    role: 'admin',
    adminKey: credentials.adminKey,
    apiKey: credentials.apiKey || '',
  }

  return user
}

export function logout(): void {
  // Client handles clearing auth state
}
