import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function EmptyState({ icon: Icon, title, description, action, className, size = 'md' }: EmptyStateProps) {
  const sizes = {
    sm: { icon: 'w-8 h-8', iconWrap: 'w-14 h-14', title: 'text-sm', desc: 'text-xs', padding: 'py-8' },
    md: { icon: 'w-10 h-10', iconWrap: 'w-18 h-18', title: 'text-base', desc: 'text-sm', padding: 'py-14' },
    lg: { icon: 'w-12 h-12', iconWrap: 'w-20 h-20', title: 'text-lg', desc: 'text-sm', padding: 'py-20' },
  }
  const s = sizes[size]

  return (
    <div className={cn('flex flex-col items-center justify-center text-center', s.padding, className)}>
      <div className={cn('rounded-2xl bg-gray-100 flex items-center justify-center mb-4 p-4')}>
        <Icon className={cn(s.icon, 'text-gray-400')} strokeWidth={1.5} />
      </div>
      <p className={cn('font-semibold text-gray-700', s.title)}>{title}</p>
      {description && <p className={cn('text-gray-400 mt-1 max-w-xs', s.desc)}>{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
