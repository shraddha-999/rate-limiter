import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/types'
import { resetApiClient } from '@/services/api'

interface AuthState {
  user: AuthUser | null
  backendUrl: string
  isAuthenticated: boolean
  setUser: (user: AuthUser, backendUrl: string) => void
  clearUser: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      backendUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
      isAuthenticated: false,

      setUser: (user, backendUrl) => {
        resetApiClient(backendUrl)
        set({ user, backendUrl, isAuthenticated: true })
      },

      clearUser: () => {
        set({ user: null, isAuthenticated: false })
      },
    }),
    {
      name: 'rateguard-auth',
      onRehydrateStorage: () => (state) => {
        // Re-configure API client after rehydration
        if (state?.backendUrl) {
          resetApiClient(state.backendUrl)
        }
      },
    }
  )
)
