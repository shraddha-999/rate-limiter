import { useEffect } from 'react'
import { useSettingsStore } from '@/store/settingsStore'

export function useTheme() {
  const { theme, update } = useSettingsStore()

  useEffect(() => {
    const root = document.documentElement
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    root.classList.toggle('dark', isDark)
    root.classList.toggle('light', !isDark)
  }, [theme])

  const setTheme = (t: 'dark' | 'light' | 'system') => update({ theme: t })

  return { theme, setTheme }
}
