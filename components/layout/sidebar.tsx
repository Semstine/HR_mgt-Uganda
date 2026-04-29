'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Briefcase, Users, UserCheck, ClipboardList,
  BarChart3, MessageSquare, Building2, Settings, ChevronRight,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Recruitment', href: '/recruitment/jobs', icon: Briefcase },
  { label: 'Candidates', href: '/recruitment/candidates', icon: Users },
  { label: 'Employees', href: '/employees', icon: UserCheck },
  { label: 'Onboarding', href: '/onboarding', icon: ClipboardList },
  { label: 'Performance', href: '/performance', icon: BarChart3 },
  { label: 'Analytics', href: '/analytics', icon: BarChart3, adminOnly: true },
  { label: 'AI Assistant', href: '/ai-assistant', icon: MessageSquare },
]

interface SidebarProps {
  companyName?: string
}

export default function Sidebar({ companyName }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER'].includes(session?.user?.role || '')

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col min-h-screen fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="p-5 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">TalentBridge</p>
            <p className="text-xs text-gray-400 truncate">{companyName || 'Africa'}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2 mt-1">Main Menu</p>
        {navItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(active ? 'sidebar-link-active' : 'sidebar-link')}
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
            </Link>
          )
        })}

        {isAdmin && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2 mt-4">Settings</p>
            <Link href="/company/onboarding" className={cn(
              pathname.startsWith('/company') ? 'sidebar-link-active' : 'sidebar-link'
            )}>
              <Building2 className="w-4.5 h-4.5" />
              <span>Company Setup</span>
            </Link>
            <Link href="/settings" className={cn(
              pathname === '/settings' ? 'sidebar-link-active' : 'sidebar-link'
            )}>
              <Settings className="w-4.5 h-4.5" />
              <span>Settings</span>
            </Link>
          </>
        )}
      </nav>

      {/* User info */}
      <div className="p-3 border-t border-gray-200">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-blue-700">
              {session?.user?.name?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-900 truncate">{session?.user?.name}</p>
            <p className="text-xs text-gray-400 truncate capitalize">
              {session?.user?.role?.replace(/_/g, ' ').toLowerCase() || 'user'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
