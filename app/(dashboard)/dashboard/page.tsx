import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/header'
import { KpiCard } from '@/components/ui/kpi-card'
import { formatDate, formatNumber } from '@/lib/utils'
import { Users, Briefcase, UserCheck, ClipboardList, TrendingUp, Clock } from 'lucide-react'
import Link from 'next/link'
import { CANDIDATE_STATUS_LABELS, CANDIDATE_STATUS_COLORS } from '@/types'
import { cn } from '@/lib/utils'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const companyId = session.user.companyId
  if (!companyId) redirect('/company/onboarding')

  const [
    totalEmployees,
    activeJobs,
    totalCandidates,
    pendingReviews,
    recentCandidates,
    recentEmployees,
    onboardingCount,
  ] = await Promise.all([
    prisma.employee.count({ where: { companyId, isActive: true } }),
    prisma.job.count({ where: { companyId, status: 'ACTIVE' } }),
    prisma.candidate.count({
      where: {
        job: { companyId },
        status: { notIn: ['ARCHIVED', 'REJECTED', 'EMPLOYEE_ACTIVE'] },
      },
    }),
    prisma.performanceReview.count({ where: { employee: { companyId }, status: 'PENDING' } }),
    prisma.candidate.findMany({
      where: { job: { companyId } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { job: { select: { title: true } } },
    }),
    prisma.employee.findMany({
      where: { companyId, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { department: { select: { name: true } } },
    }),
    prisma.onboarding.count({ where: { employee: { companyId }, status: { not: 'complete' } } }),
  ])

  return (
    <main className="flex-1">
      <Header title="Dashboard" subtitle={`Welcome back, ${session.user.name?.split(' ')[0]}`} />
      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Total Employees" value={formatNumber(totalEmployees)} icon={<Users className="w-5 h-5" />} color="blue" change="Active staff" changeType="neutral" />
          <KpiCard title="Open Positions" value={formatNumber(activeJobs)} icon={<Briefcase className="w-5 h-5" />} color="purple" change="Hiring now" changeType="neutral" />
          <KpiCard title="Active Candidates" value={formatNumber(totalCandidates)} icon={<UserCheck className="w-5 h-5" />} color="green" change="In pipeline" changeType="neutral" />
          <KpiCard title="Pending Reviews" value={formatNumber(pendingReviews)} icon={<ClipboardList className="w-5 h-5" />} color="orange" change="Need action" changeType={pendingReviews > 0 ? 'decrease' : 'neutral'} />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: '/recruitment/jobs/new', label: 'Post a Job', icon: Briefcase, color: 'bg-blue-600' },
            { href: '/recruitment/candidates', label: 'Review Candidates', icon: UserCheck, color: 'bg-green-600' },
            { href: '/onboarding', label: `Onboarding (${onboardingCount})`, icon: ClipboardList, color: 'bg-teal-600' },
            { href: '/performance', label: 'Performance Reviews', icon: TrendingUp, color: 'bg-purple-600' },
          ].map((action) => (
            <Link key={action.href} href={action.href}
              className="card p-4 flex items-center gap-3 hover:shadow-md transition-all group">
              <div className={`w-9 h-9 ${action.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <action.icon className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">{action.label}</span>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Candidates */}
          <div className="card">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Recent Applications</h3>
              <Link href="/recruitment/candidates" className="text-sm text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentCandidates.length === 0 ? (
                <p className="p-5 text-sm text-gray-400 text-center">No candidates yet. Post a job to start receiving applications.</p>
              ) : recentCandidates.map((c) => (
                <Link key={c.id} href={`/recruitment/candidates/${c.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-gray-600">
                      {c.firstName[0]}{c.lastName[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{c.firstName} {c.lastName}</p>
                    <p className="text-xs text-gray-400 truncate">{c.job.title}</p>
                  </div>
                  <span className={cn('badge text-xs', CANDIDATE_STATUS_COLORS[c.status])}>
                    {CANDIDATE_STATUS_LABELS[c.status]}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Employees */}
          <div className="card">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Recent Hires</h3>
              <Link href="/employees" className="text-sm text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentEmployees.length === 0 ? (
                <p className="p-5 text-sm text-gray-400 text-center">No employees yet.</p>
              ) : recentEmployees.map((emp) => (
                <Link key={emp.id} href={`/employees/${emp.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-blue-700">{emp.firstName[0]}{emp.lastName[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{emp.firstName} {emp.lastName}</p>
                    <p className="text-xs text-gray-400 truncate">{emp.jobTitle} · {emp.department?.name || 'No dept.'}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {formatDate(emp.startDate, 'dd MMM')}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
