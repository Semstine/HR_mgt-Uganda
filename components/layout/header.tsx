'use client'

import { signOut } from 'next-auth/react'
import { useSession } from 'next-auth/react'
import { Bell, LogOut, Search, User, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { data: session } = useSession()
  const [showMenu, setShowMenu] = useState(false)

  const name = session?.user?.name || 'User'
  const role = session?.user?.role?.replace(/_/g, ' ') || ''
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center justify-between sticky top-0 z-20 backdrop-blur-sm bg-white/95">
      {/* Page title */}
      <div>
        <h1 className="text-lg font-bold text-gray-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="search"
            placeholder="Search records…"
            className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 w-52 bg-slate-50 placeholder-gray-400"
          />
        </div>

        {/* Notifications */}
        <button className="btn-icon relative">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={cn(
              'flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-150',
              showMenu && 'bg-gray-50 border-gray-300'
            )}
          >
            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-gray-900 leading-tight max-w-28 truncate">{name}</p>
              <p className="text-xs text-gray-400 capitalize max-w-28 truncate">{role.toLowerCase()}</p>
            </div>
            <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 transition-transform duration-150', showMenu && 'rotate-180')} />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-12 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-200/60 py-2 w-52 z-50">
                <div className="px-4 py-2.5 border-b border-gray-100 mb-1">
                  <p className="text-xs font-semibold text-gray-900 truncate">{name}</p>
                  <p className="text-xs text-gray-400 truncate capitalize">{role.toLowerCase()}</p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
