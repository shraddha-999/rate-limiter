import { useState } from 'react'
import { motion } from 'framer-motion'
import { Moon, Sun, Monitor, RotateCcw, Save, Wifi } from 'lucide-react'
import toast from 'react-hot-toast'
import { Header } from '@/components/shared/Header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useSettingsStore } from '@/store/settingsStore'
import { useAuthStore } from '@/store/authStore'
import { resetApiClient } from '@/services/api'
import { getHealth } from '@/services/metricsService'

export function Settings() {
  const settings = useSettingsStore()
  const { user, setUser, backendUrl } = useAuthStore()
  const [testingConnection, setTestingConnection] = useState(false)
  const [localBackendUrl, setLocalBackendUrl] = useState(backendUrl)

  const testConnection = async () => {
    setTestingConnection(true)
    try {
      resetApiClient(localBackendUrl)
      const health = await getHealth()
      toast.success(`Connected! Backend is ${health.status} (v${health.version})`)
      if (user) {
        setUser(user, localBackendUrl)
      }
    } catch {
      toast.error('Connection failed — check the URL and backend status')
    } finally {
      setTestingConnection(false)
    }
  }

  const themeOptions = [
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  const intervalOptions = [
    { value: 2000, label: '2s (aggressive)' },
    { value: 5000, label: '5s (default)' },
    { value: 10000, label: '10s (moderate)' },
    { value: 30000, label: '30s (relaxed)' },
  ]

  return (
    <div className="flex flex-col h-full">
      <Header title="Settings" subtitle="Customize your RateGuard experience" />

      <div className="flex-1 overflow-auto p-6 space-y-6 max-w-2xl">
        {/* Appearance */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Appearance</CardTitle>
              <CardDescription>Customize the look and feel of the dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Theme</Label>
                <div className="grid grid-cols-3 gap-3">
                  {themeOptions.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => settings.update({ theme: value as 'dark' | 'light' | 'system' })}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        settings.theme === value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-border/80 hover:bg-muted/30'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${settings.theme === value ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`text-xs font-medium ${settings.theme === value ? 'text-primary' : 'text-muted-foreground'}`}>
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Animations</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Enable framer-motion transitions</p>
                </div>
                <Switch
                  checked={settings.animationsEnabled}
                  onCheckedChange={(v) => settings.update({ animationsEnabled: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Compact Mode</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Reduce spacing for more information density</p>
                </div>
                <Switch
                  checked={settings.compactMode}
                  onCheckedChange={(v) => settings.update({ compactMode: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Collapsed Sidebar</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Show only icons in the sidebar</p>
                </div>
                <Switch
                  checked={settings.sidebarCollapsed}
                  onCheckedChange={(v) => settings.update({ sidebarCollapsed: v })}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Data & Refresh */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Data & Refresh</CardTitle>
              <CardDescription>Control how often the dashboard fetches data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Refresh Interval</Label>
                <Select
                  value={String(settings.refreshInterval)}
                  onValueChange={(v) => settings.update({ refreshInterval: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {intervalOptions.map(({ value, label }) => (
                      <SelectItem key={value} value={String(value)}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Applies to Dashboard, Metrics, and Health checks
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Connection */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Backend Connection</CardTitle>
              <CardDescription>Configure the FastAPI backend URL</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Backend URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={localBackendUrl}
                    onChange={(e) => setLocalBackendUrl(e.target.value)}
                    placeholder="http://localhost:8000"
                  />
                  <Button
                    variant="outline"
                    size="default"
                    onClick={testConnection}
                    loading={testingConnection}
                    className="shrink-0"
                  >
                    <Wifi className="w-4 h-4" />
                    Test
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Current: <code className="bg-muted px-1 rounded">{backendUrl}</code>
                </p>
              </div>

              {user && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 text-xs">
                  <p className="font-medium text-foreground">Session Info</p>
                  <div className="space-y-1 text-muted-foreground">
                    <p>Name: <span className="text-foreground">{user.name}</span></p>
                    <p>Role: <span className="text-foreground">{user.role}</span></p>
                    <p>Admin Key: <span className="font-mono text-foreground">{user.adminKey.slice(0, 8)}•••</span></p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Danger zone */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-sm text-destructive">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium">Reset all settings</p>
                  <p className="text-xs text-muted-foreground">Restore all settings to their default values</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    settings.reset()
                    toast.success('Settings reset to defaults')
                  }}
                  className="hover:text-destructive hover:border-destructive"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium">Clear all logs</p>
                  <p className="text-xs text-muted-foreground">Delete all stored request logs from localStorage</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    localStorage.removeItem('rateguard-logs')
                    toast.success('Logs cleared')
                  }}
                  className="hover:text-destructive hover:border-destructive"
                >
                  Clear Logs
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
