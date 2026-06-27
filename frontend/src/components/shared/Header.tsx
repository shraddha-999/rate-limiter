import { useQuery } from '@tanstack/react-query'
import { Moon, Sun, RefreshCw, Wifi, WifiOff, Bell } from 'lucide-react'
import { motion } from 'framer-motion'
import { getHealth } from '@/services/metricsService'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatUptime } from '@/lib/utils'
import { useSettingsStore } from '@/store/settingsStore'

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const { refreshInterval } = useSettingsStore()

  const { data: health, isError, refetch, isFetching } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: refreshInterval,
    retry: 1,
  })

  const isHealthy = !isError && health?.status === 'healthy'
  const isDegraded = health?.status === 'degraded'

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between h-[60px] px-6 bg-background/80 backdrop-blur-md border-b border-border shrink-0">
      {/* Left: Page title */}
      <div>
        <h1 className="text-base font-semibold text-foreground leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2">
        {/* Backend status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs">
          {isError ? (
            <>
              <WifiOff className="w-3 h-3 text-destructive" />
              <span className="text-destructive font-medium">Offline</span>
            </>
          ) : isDegraded ? (
            <>
              <Wifi className="w-3 h-3 text-warning" />
              <span className="text-warning font-medium">Degraded</span>
            </>
          ) : health ? (
            <>
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-success"
              />
              <span className="text-success font-medium">Healthy</span>
              <span className="text-muted-foreground hidden sm:inline">
                · {health.storage_backend} · {formatUptime(health.uptime_seconds)}
              </span>
            </>
          ) : (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse" />
              <span className="text-muted-foreground">Connecting...</span>
            </>
          )}
        </div>

        {/* Refresh */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => refetch()}
          disabled={isFetching}
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>

        {/* Notifications (decorative) */}
        <Button variant="ghost" size="icon-sm" className="relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>
    </header>
  )
}
