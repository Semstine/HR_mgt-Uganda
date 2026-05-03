'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Landmark, Radio, FileText, ClipboardCheck,
  Users, BadgeCheck, Briefcase, ClipboardList, ShieldCheck,
  UserCheck, Calendar, Gavel, DollarSign, BarChart3, Scale,
  Plug, Settings, ChevronRight,
} from 'lucide-react'

const sections = [
  {
    label: null,
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Recruitment Pipeline',
    items: [
      { label: 'Establishment & Vacancies', href: '/establishment', icon: Landmark },
      { label: 'Advertisements', href: '/advertisements', icon: Radio },
      { label: 'Applications / PSC Form 3', href: '/applications', icon: FileText },
      { label: 'Shortlisting', href: '/shortlisting', icon: ClipboardCheck },
      { label: 'Interviews & Tests', href: '/interviews', icon: Users },
      { label: 'Verification', href: '/verification', icon: BadgeCheck },
      { label: 'Appointment Letters', href: '/appointments', icon: Briefcase },
    ],
  },
  {
    label: 'Workforce',
    items: [
      { label: 'Onboarding & Oath', href: '/onboarding', icon: ClipboardList },
      { label: 'Probation', href: '/probation', icon: ShieldCheck },
      { label: 'Employee Records', href: '/employees', icon: UserCheck },
      { label: 'Leave', href: '/leave', icon: Calendar },
      { label: 'Discipline & Grievance', href: '/discipline-grievance', icon: Gavel },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Payroll Certification', href: '/payroll', icon: DollarSign },
      { label: 'Reports & Compliance', href: '/reports', icon: BarChart3 },
      { label: 'Audit Log', href: '/audit-log', icon: Scale },
      { label: 'Integrations', href: '/integrations', icon: Plug },
      { label: 'Settings', href: '/settings-reference-data', icon: Settings },
    ],
  },
]

interface SidebarProps {
  companyName?: string
}

export default function Sidebar({ companyName }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()

  const name = session?.user?.name || 'User'
  const role = session?.user?.role?.replace(/_/g, ' ') || ''
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col min-h-screen fixed left-0 top-0 z-30">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-200">
            <Users className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 leading-tight">DSC-HRMS</p>
            <p className="text-xs text-gray-400 truncate mt-0.5">{companyName || 'District Service Commission'}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
        {sections.map((section, si) => (
          <div key={si}>
            {section.label && (
              <p className="sidebar-section">{section.label}</p>
            )}
            {section.items.map((item) => {
              const active = isActive(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(active ? 'sidebar-link-active' : 'sidebar-link', 'group')}
                >
                  <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600')} strokeWidth={active ? 2.5 : 2} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {active && <ChevronRight className="w-3 h-3 opacity-50" />}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-xs font-bold text-white">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-900 truncate">{name}</p>
            <p className="text-xs text-gray-400 truncate capitalize">{role.toLowerCase()}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
