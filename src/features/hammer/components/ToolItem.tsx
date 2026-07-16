import React from 'react'
import { cn } from '@/lib/utils'

interface ToolItemProps {
  icon: React.ElementType
  iconColor: string
  iconBg: string
  title: string
  description: string
  onClick: () => void
  badge?: string
  variant?: 'default' | 'danger'
}

export const ToolItem: React.FC<ToolItemProps> = ({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  description,
  onClick,
  badge,
  variant = 'default'
}) => (
  <button
    onClick={onClick}
    className={cn(
      'w-full flex items-center gap-4 p-4 rounded-xl transition-colors text-left',
      variant === 'danger' ? 'bg-rose-500/10 hover:bg-rose-500/20' : 'bg-surface hover:bg-elevated'
    )}
  >
    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
      <Icon className={cn('w-5 h-5', iconColor)} />
    </div>
    <div className="flex-1 min-w-0">
      <p className={cn('font-medium', variant === 'danger' ? 'text-rose-500' : 'text-primary')}>{title}</p>
      <p className="text-sm text-muted truncate">{description}</p>
    </div>
    {badge && <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded">{badge}</span>}
  </button>
)
