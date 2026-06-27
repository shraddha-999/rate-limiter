import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LogEntry, SimulatorResult } from '@/types'
import { generateId } from '@/lib/utils'

interface LogsState {
  logs: LogEntry[]
  addFromSimulatorResult: (result: SimulatorResult) => void
  clear: () => void
}

export const useLogsStore = create<LogsState>()(
  persist(
    (set) => ({
      logs: [],

      addFromSimulatorResult: (result) => {
        const entry: LogEntry = {
          id: generateId(),
          timestamp: result.timestamp,
          user: result.identifier,
          endpoint: '/rate-limit/check',
          allowed: result.status === 'allowed',
          algorithm: result.algorithm,
          remaining: result.remaining,
          execution_time_ms: result.response_time_ms,
          identifier_type: 'user_id',
        }
        set((state) => ({
          logs: [entry, ...state.logs].slice(0, 1000),
        }))
      },

      clear: () => set({ logs: [] }),
    }),
    {
      name: 'rateguard-logs',
      partialize: (state) => ({ logs: state.logs.slice(0, 500) }),
    }
  )
)
