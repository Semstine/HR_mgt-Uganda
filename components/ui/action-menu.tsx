'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface ActionItem {
  label: string
  icon?: LucideIcon
  onClick: () => void
  variant?: 'default' | 'danger'
  disabled?: boolean
}

interface ActionMenuProps {
  actions: ActionItem[]
  label?: string
}

export function ActionMenu({ actions, label }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(!open) }}
        className="btn-icon"
        aria-label={label || 'Actions'}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-10 bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/60 py-1.5 w-48 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {actions.map((action, i) => {
            const Icon = action.icon
            return (
              <button
                key={i}
                disabled={action.disabled}
                onClick={e => { e.stopPropagation(); setOpen(false); action.onClick() }}
                className={cn(
                  'flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-40',
                  action.variant === 'danger'
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-gray-700 hover:bg-gray-50',
                )}
              >
                {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                {action.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
