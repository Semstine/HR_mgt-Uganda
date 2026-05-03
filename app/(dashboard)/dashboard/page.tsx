import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/header'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { prisma } from '@/lib/prisma'
import { getDscSession, scopedDistrictWhere } from '@/lib/dsc-rbac'
import { formatNumber } from '@/lib/utils'
import {
  Briefcase, ClipboardCheck, Users, AlertTriangle,
  ArrowRight, CheckCircle2, Landmark,
  FileText, ShieldCheck, TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const STEP_LABELS: Record<number, string> = {
  1: 'Vacancy Declared', 2: 'Wage Bill', 3: 'DSC Approved', 4: 'Advert Prepared',
  5: 'Advert Published', 6: 'Applications Open', 7: 'Applications Closed',
  8: 'Shortlisting', 9: 'Shortlist Locked', 10: 'Interviews', 11: 'Scores Submitted',
  12: 'Verification', 13: 'DSC Decision', 14: 'Appointment Letter', 15: 'Acceptance',
  16: 'Onboarding', 17: 'Confirmed',
}

const STATUS_STYLES: Record<string, string> = {
  step_1_vacancy_declared: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  step_5_advert_published: 'bg-blue-50 text-blue-700 border-blue-200',
  step_8_shortlisting: 'bg-purple-50 text-purple-700 border-purple-200',
  step_10_interviews: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  step_14_appointment_letter: 'bg-orange-50 text-orange-700 border-orange-200',
  step_16_onboarding: 'bg-teal-50 text-teal-700 border-teal-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
}

export default async function DashboardPage() {
  const context = await getDscSession()
  if (!context) redirect('/login')

  const where = scopedDistrictWhere(context)

  const [districts, structures, cycles, applications, employees, ghostFlags, pendingLeaves] = await Promise.all([
    context.role === 'NATIONAL_ADMIN_MOPS'
      ? prisma.district.count({ where: { isActive: true } })
      : Promise.resolve(1),
    prisma.approvedStaffStructure.findMany({ where }),
    prisma.recruitmentCycle.findMany({
      where,
      include: {
        district: true,
        workflowSteps: { orderBy: { stepNumber: 'asc' } },
        _count: { select: { applications: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 8,
    }),
    prisma.pSCForm3Application.count({ where }),
    prisma.employeeGovernmentProfile.count({ where: { ...where, employmentStatus: 'active' } }),
    prisma.ghostWorkerFlag.count({ where: { ...where, status: 'open' } }),
    prisma.leaveRequest.count({ where: { employee: where, status: 'pending' } }),
  ])

  const vacancies = structures.reduce((s, i) => s + i.vacantPosts, 0)
  const underRecruitment = structures.reduce((s, i) => s + i.underRecruitment, 0)
  const activeCycles = cycles.filter(c => c.status !== 'completed')

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <main className="flex-1 bg-slate-50">
      <Header
        title="Dashboard"
        subtitle={`${context.name} · ${context.role.replace(/_/g, ' ')}`}
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Welcome banner */}
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white shadow-lg shadow-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">{greeting}</p>
              <h2 className="text-xl font-bold text-white mt-0.5">{context.name}</h2>
              <p className="text-blue-200 text-sm mt-1">
                {activeCycles.length} active recruitment cycle{activeCycles.length !== 1 ? 's' : ''} in progress
              </p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              {ghostFlags > 0 && (
                <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-2.5 text-center">
                  <p className="text-xl font-bold text-white">{ghostFlags}</p>
                  <p className="text-red-200 text-xs mt-0.5">Ghost Worker Alert{ghostFlags !== 1 ? 's' : ''}</p>
                </div>
              )}
              {pendingLeaves > 0 && (
                <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-center">
                  <p className="text-xl font-bold text-white">{pendingLeaves}</p>
                  <p className="text-blue-200 text-xs mt-0.5">Leave Pending</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Vacant Posts"
            value={formatNumber(vacancies)}
            icon={Briefcase}
            color="orange"
            subtitle={`${underRecruitment} under recruitment`}
            changeType="neutral"
          />
          <StatCard
            title="Applications Received"
            value={formatNumber(applications)}
            icon={FileText}
            color="blue"
            subtitle="All intake channels"
          />
          <StatCard
            title="Active Officers"
            value={formatNumber(employees)}
            icon={Users}
            color="green"
            subtitle="Government profiles"
          />
          <StatCard
            title={context.role === 'NATIONAL_ADMIN_MOPS' ? 'Active Districts' : 'Open Flags'}
            value={context.role === 'NATIONAL_ADMIN_MOPS' ? formatNumber(districts) : formatNumber(ghostFlags)}
            icon={context.role === 'NATIONAL_ADMIN_MOPS' ? Landmark : AlertTriangle}
            color={ghostFlags > 0 ? 'red' : 'teal'}
            subtitle={context.role === 'NATIONAL_ADMIN_MOPS' ? 'Under MoPS oversight' : 'Ghost worker flags'}
          />
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Active recruitment cycles — 2/3 width */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Active Recruitment Cycles</h3>
                <p className="text-xs text-gray-400 mt-0.5">17-step DSC workflow progress</p>
              </div>
              <Link href="/establishment" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {activeCycles.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={ClipboardCheck}
                  title="No active recruitment cycles"
                  description="Declare a vacancy to begin the 17-step DSC recruitment process."
                  size="sm"
                  action={
                    <Link href="/establishment" className="btn-primary">
                      Declare Vacancy
                    </Link>
                  }
                />
              </div>
            ) : (
              <div className="space-y-3">
                {activeCycles.map((cycle) => {
                  const pct = Math.round((cycle.currentStep / 17) * 100)
                  const activeStep = cycle.workflowSteps.find(s => s.stepNumber === cycle.currentStep)
                  const statusStyle = STATUS_STYLES[cycle.status] || 'bg-gray-50 text-gray-600 border-gray-200'

                  return (
                    <Link
                      key={cycle.id}
                      href={`/recruitment/${cycle.id}`}
                      className="card-hover block p-5"
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{cycle.postTitle}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {cycle.postRef} · {cycle.district.name} · {cycle._count.applications} application{cycle._count.applications !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={cn('badge border text-xs', statusStyle)}>
                            Step {cycle.currentStep}/17
                          </span>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="space-y-2">
                        <div className="progress-bar">
                          <div
                            className={cn('progress-fill', pct >= 80 ? 'progress-fill-green' : pct >= 40 ? 'progress-fill' : 'progress-fill-orange')}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-400">
                            {activeStep?.stepName || STEP_LABELS[cycle.currentStep] || cycle.status}
                          </p>
                          <p className="text-xs font-semibold text-gray-600">{pct}%</p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right column — quick actions + status */}
          <div className="space-y-4">

            {/* Quick actions */}
            <div className="card p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {[
                  { href: '/establishment', label: 'Declare Vacancy', icon: Briefcase, color: 'text-blue-600 bg-blue-50' },
                  { href: '/applications', label: 'Review Applications', icon: FileText, color: 'text-purple-600 bg-purple-50' },
                  { href: '/shortlisting', label: 'Score Shortlist', icon: ClipboardCheck, color: 'text-indigo-600 bg-indigo-50' },
                  { href: '/verification', label: 'Verify Credentials', icon: ShieldCheck, color: 'text-green-600 bg-green-50' },
                  { href: '/appointments', label: 'Issue Appointment', icon: CheckCircle2, color: 'text-orange-600 bg-orange-50' },
                  { href: '/reports', label: 'Generate Report', icon: TrendingUp, color: 'text-teal-600 bg-teal-50' },
                ].map(({ href, label, icon: Icon, color }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
                      <Icon className="w-4 h-4" strokeWidth={2} />
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 ml-auto group-hover:text-gray-500 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Workflow overview */}
            <div className="card p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Pipeline Overview</h3>
              <div className="space-y-3">
                {[
                  { label: 'Total Cycles', value: cycles.length, color: 'text-gray-900' },
                  { label: 'Active', value: activeCycles.length, color: 'text-blue-600' },
                  { label: 'Completed', value: cycles.filter(c => c.status === 'completed').length, color: 'text-green-600' },
                  { label: 'Applications', value: applications, color: 'text-purple-600' },
                  { label: 'Active Staff', value: employees, color: 'text-teal-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-500">{label}</span>
                    <span className={cn('text-sm font-bold tabular-nums', color)}>{formatNumber(value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance alerts */}
            {(ghostFlags > 0 || pendingLeaves > 0) && (
              <div className="card p-5 border-orange-100 bg-orange-50/50">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-bold text-orange-800">Compliance Alerts</h3>
                </div>
                <div className="space-y-2">
                  {ghostFlags > 0 && (
                    <Link href="/employees" className="flex items-center justify-between p-2 bg-white rounded-lg hover:shadow-sm transition-all">
                      <span className="text-xs text-gray-700">Ghost worker flags</span>
                      <span className="badge bg-red-100 text-red-700">{ghostFlags}</span>
                    </Link>
                  )}
                  {pendingLeaves > 0 && (
                    <Link href="/leave" className="flex items-center justify-between p-2 bg-white rounded-lg hover:shadow-sm transition-all">
                      <span className="text-xs text-gray-700">Pending leave requests</span>
                      <span className="badge bg-yellow-100 text-yellow-700">{pendingLeaves}</span>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
