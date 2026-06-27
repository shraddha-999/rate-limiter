import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Eye, EyeOff, Zap, Globe, Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login } from '@/services/authService'
import { useAuthStore } from '@/store/authStore'
import { DEMO_CONFIG } from '@/constants'

export function Login() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [form, setForm] = useState({
    name: 'Shraddha',
    adminKey: DEMO_CONFIG.adminKey,
    apiKey: DEMO_CONFIG.apiKey,
    backendUrl: DEMO_CONFIG.backendUrl,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Please enter your name')
    if (!form.adminKey.trim()) return toast.error('Admin key is required')
    if (!form.backendUrl.trim()) return toast.error('Backend URL is required')

    setLoading(true)
    try {
      const user = await login({
        name: form.name,
        adminKey: form.adminKey,
        apiKey: form.apiKey,
        backendUrl: form.backendUrl,
      })
      setUser(user, form.backendUrl)
      toast.success(`Welcome back, ${user.name}!`)
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = () => {
    setForm({
      name: 'Demo Admin',
      adminKey: 'change-me-in-production',
      apiKey: '',
      backendUrl: 'http://localhost:8000',
    })
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:flex-col lg:w-1/2 bg-card border-r border-border p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between h-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground">RateGuard</p>
              <p className="text-xs text-muted-foreground">API Rate Limiting Platform</p>
            </div>
          </div>

          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-4xl font-black text-foreground leading-tight mb-4">
                Protect your APIs<br />
                <span className="text-gradient">at any scale</span>
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Enterprise-grade rate limiting with Fixed Window, Sliding Window,
                and Token Bucket algorithms backed by Redis.
              </p>
            </motion.div>

            <div className="space-y-4">
              {[
                { icon: Zap, label: 'Sub-millisecond decisions', desc: 'Atomic Lua scripts in Redis ensure race-free rate limiting' },
                { icon: Globe, label: 'Distributed by design', desc: 'All instances share state through Redis' },
                { icon: Lock, label: 'Per-tier access control', desc: 'Free, Premium, Enterprise tiers with different limits' },
              ].map(({ icon: Icon, label, desc }) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Built with FastAPI · Redis · Prometheus · Grafana
          </p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-6"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">RateGuard</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">Connect to Backend</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Enter your credentials to access the dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                placeholder="Your name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="backendUrl">Backend URL</Label>
              <Input
                id="backendUrl"
                placeholder="http://localhost:8000"
                value={form.backendUrl}
                onChange={(e) => setForm({ ...form, backendUrl: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">The URL where your FastAPI backend is running</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adminKey">Admin API Key</Label>
              <div className="relative">
                <Input
                  id="adminKey"
                  type={showKey ? 'text' : 'password'}
                  placeholder="Your X-Admin-Key"
                  value={form.adminKey}
                  onChange={(e) => setForm({ ...form, adminKey: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Set via ADMIN_API_KEY env var in backend</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="apiKey">API Key <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="X-API-Key (leave empty if ALLOWED_API_KEYS not set)"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              />
            </div>

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Connect & Sign In
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={fillDemo}>
            <Zap className="w-4 h-4" />
            Fill Demo Credentials
          </Button>

          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Default credentials</p>
            <p>Admin Key: <code className="bg-muted px-1 rounded">change-me-in-production</code></p>
            <p>Backend: <code className="bg-muted px-1 rounded">http://localhost:8000</code></p>
            <p>Start backend: <code className="bg-muted px-1 rounded">docker compose up -d</code></p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
