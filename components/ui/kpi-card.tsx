import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: 'increase' | 'decrease' | 'neutral'
  icon: React.ReactNode
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'teal'
}

const colors: Record<string, { bg: string; icon: string; border: string }> = {
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   border: 'border-blue-100' },
  green:  { bg: 'bg-green-50',  icon: 'text-green-600',  border: 'border-green-100' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-100' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-100' },
  red:    { bg: 'bg-red-50',    icon: 'text-red-600',    border: 'border-red-100' },
  teal:   { bg: 'bg-teal-50',   icon: 'text-teal-600',   border: 'border-teal-100' },
}

export function KpiCard({ title, value, change, changeType = 'neutral', icon, color = 'blue' }: KpiCardProps) {
  const c = colors[color]
  const ChangeIcon = changeType === 'increase' ? TrendingUp : changeType === 'decrease' ? TrendingDown : Minus
  const changeColor = changeType === 'increase' ? 'text-green-600' : changeType === 'decrease' ? 'text-red-500' : 'text-gray-400'

  return (
    <div className="card p-5 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2 tabular-nums">{value}</p>
          {change && (
            <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', changeColor)}>
              <ChangeIcon className="w-3 h-3 flex-shrink-0" />
              <span>{change}</span>
            </div>
          )}
        </div>
        <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border', c.bg, c.border, c.icon)}>
          {icon}
        </div>
      </div>
    </div>
  )
}
