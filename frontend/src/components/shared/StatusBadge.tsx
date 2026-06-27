import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: 'allowed' | 'blocked' | 'healthy' | 'degraded' | 'unhealthy' | 'enabled' | 'disabled' | string
  size?: 'sm' | 'md'
}

const statusConfig: Record<string, { label: string; className: string }> = {
  allowed: { label: 'Allowed', className: 'bg-success/15 text-success border-success/30' },
  blocked: { label: 'Blocked', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  healthy: { label: 'Healthy', className: 'bg-success/15 text-success border-success/30' },
  degraded: { label: 'Degraded', className: 'bg-warning/15 text-warning border-warning/30' },
  unhealthy: { label: 'Unhealthy', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  enabled: { label: 'Enabled', className: 'bg-success/15 text-success border-success/30' },
  disabled: { label: 'Disabled', className: 'bg-muted text-muted-foreground border-border' },
  error: { label: 'Error', className: 'bg-destructive/15 text-destructive border-destructive/30' },
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-muted text-muted-foreground border-border' }

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border font-medium',
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
      config.className
    )}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {config.label}
    </span>
  )
}
