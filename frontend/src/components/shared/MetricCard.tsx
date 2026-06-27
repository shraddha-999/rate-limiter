import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: ReactNode
  trend?: number
  trendLabel?: string
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info'
  loading?: boolean
  className?: string
  delay?: number
}

const variantStyles = {
  default: 'border-border',
  success: 'border-success/30 bg-success/5',
  danger: 'border-destructive/30 bg-destructive/5',
  warning: 'border-warning/30 bg-warning/5',
  info: 'border-info/30 bg-info/5',
}

const iconStyles = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/15 text-success',
  danger: 'bg-destructive/15 text-destructive',
  warning: 'bg-warning/15 text-warning',
  info: 'bg-info/15 text-info',
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  variant = 'default',
  loading = false,
  className,
  delay = 0,
}: MetricCardProps) {
  if (loading) {
    return (
      <div className={cn('rounded-xl border border-border bg-card p-5', className)}>
        <div className="flex items-start justify-between mb-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-28 mb-2" />
        <Skeleton className="h-3 w-20" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={cn(
        'relative rounded-xl border bg-card p-5 shadow-card hover:shadow-card-hover transition-all duration-200 group overflow-hidden',
        variantStyles[variant],
        className
      )}
    >
      {/* Background glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className={cn(
          'absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl',
          variant === 'success' && 'bg-success/10',
          variant === 'danger' && 'bg-destructive/10',
          variant === 'warning' && 'bg-warning/10',
          variant === 'info' && 'bg-info/10',
          variant === 'default' && 'bg-primary/10',
        )} />
      </div>

      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className={cn('flex items-center justify-center w-9 h-9 rounded-lg', iconStyles[variant])}>
          {icon}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
        <div className="flex items-center gap-1.5">
          {trend !== undefined && (
            <span className={cn(
              'flex items-center gap-0.5 text-xs font-medium',
              trend > 0 ? 'text-success' : trend < 0 ? 'text-destructive' : 'text-muted-foreground'
            )}>
              {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              {Math.abs(trend)}%
            </span>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {trendLabel && (
          <p className="text-xs text-muted-foreground">{trendLabel}</p>
        )}
      </div>
    </motion.div>
  )
}
