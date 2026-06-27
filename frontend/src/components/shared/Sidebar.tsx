import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Play, Settings2, GitBranch, Database,
  BarChart2, ScrollText, BookOpen, SlidersHorizontal,
  Shield, ChevronLeft, ChevronRight, LogOut, User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/store/settingsStore'
import { useAuthStore } from '@/store/authStore'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'

const NAV = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/simulator', label: 'Request Simulator', icon: Play },
  { path: '/configurations', label: 'Configurations', icon: Settings2 },
  { path: '/algorithms', label: 'Algorithm Visualizer', icon: GitBranch },
  { path: '/redis', label: 'Redis Inspector', icon: Database },
  { path: '/metrics', label: 'Metrics', icon: BarChart2 },
  { path: '/logs', label: 'Logs', icon: ScrollText },
  { path: '/api-docs', label: 'API Docs', icon: BookOpen },
  { path: '/settings', label: 'Settings', icon: SlidersHorizontal },
]

export function Sidebar() {
  const { sidebarCollapsed, update } = useSettingsStore()
  const { user, clearUser } = useAuthStore()
  const location = useLocation()
  const collapsed = sidebarCollapsed

  const toggle = () => update({ sidebarCollapsed: !collapsed })

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 64 : 260 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="relative flex flex-col h-screen bg-card border-r border-border shrink-0 z-20 overflow-hidden"
      >
        {/* Logo */}
        <div className="flex items-center h-[60px] px-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15 shrink-0">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="min-w-0"
                >
                  <p className="text-sm font-bold text-foreground truncate">RateGuard</p>
                  <p className="text-[10px] text-muted-foreground truncate">API Rate Limiter</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5 no-scrollbar">
          {NAV.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path || location.pathname.startsWith(path + '/')
            const item = (
              <Link
                key={path}
                to={path}
                className={cn(
                  'sidebar-link',
                  active && 'active',
                  collapsed && 'justify-center px-2'
                )}
              >
                <Icon className="shrink-0 w-4 h-4" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="truncate overflow-hidden"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={path}>
                  <TooltipTrigger asChild>{item}</TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              )
            }
            return item
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-border p-2 shrink-0">
          <div className={cn('flex items-center gap-2 p-2 rounded-lg', collapsed && 'justify-center')}>
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 shrink-0">
              <User className="w-3.5 h-3.5 text-primary" />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-xs font-medium text-foreground truncate">{user?.name || 'Admin'}</p>
                  <Badge variant="default" className="text-[10px] px-1.5 py-0 mt-0.5">
                    {user?.role || 'admin'}
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
            {!collapsed && (
              <button
                onClick={clearUser}
                className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={toggle}
          className="absolute -right-3 top-[72px] flex items-center justify-center w-6 h-6 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-all shadow-sm z-10"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </motion.aside>
    </TooltipProvider>
  )
}
