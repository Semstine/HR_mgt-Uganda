import { redirect } from 'next/navigation'
import Header from '@/components/layout/header'
import { KpiCard } from '@/components/ui/kpi-card'
import { prisma } from '@/lib/prisma'
import { getDscSession, scopedDistrictWhere } from '@/lib/dsc-rbac'
import { formatDate, formatNumber } from '@/lib/utils'
import { Briefcase, ClipboardCheck, Landmark, Users } from 'lucide-react'

export default async function DashboardPage() {
  const context = await getDscSession()
  if (!context) redirect('/login')

  const where = scopedDistrictWhere(context)
  const [districts, structures, cycles, applications, employees, reports] = await Promise.all([
    context.role === 'NATIONAL_ADMIN_MOPS' ? prisma.district.count({ where: { isActive: true } }) : Promise.resolve(1),
    prisma.approvedStaffStructure.findMany({ where }),
    prisma.recruitmentCycle.findMany({ where, include: { district: true, workflowSteps: { orderBy: { stepNumber: 'asc' } }, _count: { select: { applications: true } } }, orderBy: { createdAt: 'desc' }, take: 6 }),
    prisma.pSCForm3Application.count({ where }),
    prisma.employeeGovernmentProfile.count({ where: { ...where, employmentStatus: 'active' } }),
    prisma.statutoryReport.findMany({ where, orderBy: { generatedAt: 'desc' }, take: 4 }),
  ])

  const vacancies = structures.reduce((sum, item) => sum + item.vacantPosts, 0)
  const underRecruitment = structures.reduce((sum, item) => sum + item.underRecruitment, 0)

  return (
    <main className="flex-1">
      <Header title="DSC-HRMS Dashboard" subtitle={`${context.name} · ${context.role.replace(/_/g, ' ')}`} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="District Scope" value={formatNumber(districts)} icon={<Landmark className="w-5 h-5" />} color="blue" change="Access controlled" changeType="neutral" />
          <KpiCard title="Vacant Posts" value={formatNumber(vacancies)} icon={<Briefcase className="w-5 h-5" />} color="orange" change={`${underRecruitment} under recruitment`} changeType="neutral" />
          <KpiCard title="PSC Form 3 Applications" value={formatNumber(applications)} icon={<ClipboardCheck className="w-5 h-5" />} color="green" change="All intake channels" changeType="neutral" />
          <KpiCard title="Active Officers" value={formatNumber(employees)} icon={<Users className="w-5 h-5" />} color="purple" change="Government profiles" changeType="neutral" />
        </div>

        <div className="card">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">17-Step Recruitment Cycles</h3>
            <p className="text-sm text-gray-500 mt-1">Live cycle state, assigned actor, blockers, and generated documents.</p>
          </div>
          <div className="divide-y divide-gray-50">
            {cycles.map((cycle) => {
              const activeStep = cycle.workflowSteps.find((step) => step.stepNumber === cycle.currentStep)
              return (
                <div key={cycle.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{cycle.postTitle}</p>
                      <p className="text-xs text-gray-500">{cycle.postRef} · {cycle.district.name} · {cycle._count.applications} applications</p>
                    </div>
                    <p className="text-xs font-semibold text-blue-700">Step {cycle.currentStep}/17</p>
                  </div>
                  <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600" style={{ width: `${Math.round((cycle.currentStep / 17) * 100)}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{activeStep?.stepName || cycle.status}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Statutory Reports</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {reports.length === 0 ? <p className="p-5 text-sm text-gray-400">No reports generated yet.</p> : reports.map((report) => (
              <div key={report.id} className="px-5 py-3 flex items-center justify-between">
                <p className="text-sm text-gray-800">{report.reportType.replace(/_/g, ' ')} · {report.period}</p>
                <p className="text-xs text-gray-400">{formatDate(report.generatedAt, 'dd MMM yyyy')}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
