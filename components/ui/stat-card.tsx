import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'teal' | 'indigo'
  change?: string
  changeType?: 'increase' | 'decrease' | 'neutral'
  subtitle?: string
  onClick?: () => void
}

const colorMap = {
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   ring: 'border-blue-100' },
  green:  { bg: 'bg-green-50',  icon: 'text-green-600',  ring: 'border-green-100' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', ring: 'border-purple-100' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-600', ring: 'border-orange-100' },
  red:    { bg: 'bg-red-50',    icon: 'text-red-600',    ring: 'border-red-100' },
  teal:   { bg: 'bg-teal-50',   icon: 'text-teal-600',   ring: 'border-teal-100' },
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', ring: 'border-indigo-100' },
}

export function StatCard({ title, value, icon: Icon, color = 'blue', change, changeType = 'neutral', subtitle, onClick }: StatCardProps) {
  const c = colorMap[color]
  const ChangeIcon = changeType === 'increase' ? TrendingUp : changeType === 'decrease' ? TrendingDown : Minus
  const changeColor = changeType === 'increase' ? 'text-green-600' : changeType === 'decrease' ? 'text-red-500' : 'text-gray-400'

  return (
    <div
      className={cn('card p-5 hover:shadow-md transition-all duration-200', onClick && 'cursor-pointer')}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1.5 tabular-nums">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          {change && (
            <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', changeColor)}>
              <ChangeIcon className="w-3 h-3" />
              <span>{change}</span>
            </div>
          )}
        </div>
        <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border', c.bg, c.ring)}>
          <Icon className={cn('w-5 h-5', c.icon)} strokeWidth={2} />
        </div>
      </div>
    </div>
  )
}
