import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppSettings } from '@/types'

interface SettingsState extends AppSettings {
  update: (patch: Partial<AppSettings>) => void
  reset: () => void
}

const defaults: AppSettings = {
  theme: 'dark',
  accentColor: '#6366f1',
  refreshInterval: 5000,
  backendUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  sidebarCollapsed: false,
  compactMode: false,
  animationsEnabled: true,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      update: (patch) => set((state) => ({ ...state, ...patch })),
      reset: () => set(defaults),
    }),
    { name: 'rateguard-settings' }
  )
)
