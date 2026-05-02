import { redirect } from 'next/navigation'
import Header from '@/components/layout/header'
import { KpiCard } from '@/components/ui/kpi-card'
import { prisma } from '@/lib/prisma'
import { getDscSession, scopedDistrictWhere } from '@/lib/dsc-rbac'
import { formatDate, formatNumber } from '@/lib/utils'
import { AlertTriangle, CheckCircle2, Clock, FileText } from 'lucide-react'

type ModuleKey =
  | 'establishment'
  | 'advertisements'
  | 'applications'
  | 'shortlisting'
  | 'interviews'
  | 'verification'
  | 'appointments'
  | 'onboarding'
  | 'probation'
  | 'employees'
  | 'leave'
  | 'discipline'
  | 'payroll'
  | 'reports'
  | 'audit'
  | 'integrations'
  | 'settings'

export default async function DscModulePage({ title, subtitle, moduleKey }: { title: string; subtitle: string; moduleKey: ModuleKey }) {
  const context = await getDscSession()
  if (!context) redirect('/login')

  const where = scopedDistrictWhere(context)
  const data = await getModuleData(moduleKey, where)

  return (
    <main className="flex-1">
      <Header title={title} subtitle={subtitle} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {data.metrics.map((metric) => (
            <KpiCard
              key={metric.title}
              title={metric.title}
              value={formatNumber(metric.value)}
              icon={metric.icon}
              color={metric.color}
              change={metric.change}
              changeType={metric.changeType}
            />
          ))}
        </div>

        <div className="card">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">{data.tableTitle}</h3>
            <p className="text-sm text-gray-500 mt-1">{data.tableSubtitle}</p>
          </div>
          <div className="divide-y divide-gray-50">
            {data.rows.length === 0 ? (
              <p className="p-5 text-sm text-gray-400">No records available for your district scope.</p>
            ) : data.rows.map((row) => (
              <div key={row.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{row.title}</p>
                  <p className="text-xs text-gray-500 truncate">{row.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-medium text-gray-700">{row.status}</p>
                  {row.date && <p className="text-xs text-gray-400 mt-1">{formatDate(row.date, 'dd MMM yyyy')}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

async function getModuleData(moduleKey: ModuleKey, districtWhere: { districtId?: string }) {
  if (moduleKey === 'establishment') {
    const [structures, vacancies, clearances, notices] = await Promise.all([
      prisma.approvedStaffStructure.findMany({ where: districtWhere, include: { department: true }, orderBy: { postTitle: 'asc' } }),
      prisma.vacancyDeclaration.findMany({ where: districtWhere, orderBy: { createdAt: 'desc' }, take: 8 }),
      prisma.wageBillClearance.findMany({ where: districtWhere }),
      prisma.establishmentNotice.findMany({ where: districtWhere }),
    ])
    return moduleData(
      [
        metric('Approved Posts', structures.reduce((sum, item) => sum + item.approvedPosts, 0)),
        metric('Vacant Posts', structures.reduce((sum, item) => sum + item.vacantPosts, 0), 'orange'),
        metric('Under Recruitment', structures.reduce((sum, item) => sum + item.underRecruitment, 0), 'purple'),
        metric('Active Notices', notices.filter((item) => item.status === 'active').length, 'green'),
      ],
      'Vacancy Declarations',
      'HoD declarations, DHRO consolidation, and wage-bill clearance status.',
      vacancies.map((item) => row(item.id, item.postTitle, `${item.grade} · ${item.vacancyReason} · ${item.numberOfVacancies} post(s)`, item.status, item.createdAt)),
    )
  }

  if (moduleKey === 'applications') {
    const applications = await prisma.pSCForm3Application.findMany({ where: districtWhere, include: { recruitmentCycle: true }, orderBy: { submittedAt: 'desc' }, take: 10 })
    return moduleData(
      [
        metric('Applications', applications.length),
        metric('Online', applications.filter((item) => item.intakeChannel === 'online').length, 'green'),
        metric('USSD', applications.filter((item) => item.intakeChannel === 'ussd').length, 'purple'),
        metric('Paper', applications.filter((item) => item.intakeChannel === 'paper').length, 'orange'),
      ],
      'PSC Form 3 Register',
      'Unified register for online, USSD, and scanned paper applications.',
      applications.map((item) => row(item.id, `${item.firstName} ${item.lastName}`, `${item.applicationRef} · ${item.postRef} · ${item.intakeChannel}`, item.status, item.submittedAt || item.createdAt)),
    )
  }

  if (moduleKey === 'audit') {
    const events = await prisma.immutableAuditEvent.findMany({ where: districtWhere, orderBy: { timestamp: 'desc' }, take: 10 })
    return moduleData(
      [
        metric('Audit Events', events.length),
        metric('Critical Actions', events.filter((item) => item.action.includes('score') || item.action.includes('decision') || item.action.includes('cycle')).length, 'orange'),
        metric('Immutable', events.length, 'green'),
        metric('Read Only', 1, 'purple'),
      ],
      'Immutable Audit Events',
      'Append-only event stream for DSC and audit inspection.',
      events.map((item) => row(item.id, item.action, `${item.actorRole} · ${item.entityType} ${item.entityId}`, item.districtId || 'national', item.timestamp)),
    )
  }

  if (moduleKey === 'employees') {
    const employees = await prisma.employeeGovernmentProfile.findMany({ where: districtWhere, orderBy: { createdAt: 'desc' }, take: 10 })
    return moduleData(
      [
        metric('Active Employees', employees.filter((item) => item.employmentStatus === 'active').length),
        metric('HCM Pending', employees.filter((item) => item.hcmSyncStatus !== 'synced').length, 'orange'),
        metric('PWD Staff', employees.filter((item) => item.pwdStatus).length, 'purple'),
        metric('Leave Balance Avg', Math.round(avg(employees.map((item) => item.annualLeaveBalance))), 'green'),
      ],
      'Government Personnel Files',
      'District personnel records, HCM sync status, deployment, salary and statutory fields.',
      employees.map((item) => row(item.id, `${item.firstName} ${item.lastName}`, `${item.employeeNumber} · ${item.postTitle} · ${item.department}`, item.employmentStatus, item.createdAt)),
    )
  }

  const cycles = await prisma.recruitmentCycle.findMany({
    where: districtWhere,
    include: {
      advert: true,
      applications: true,
      shortlistingPanel: true,
      interviewPanel: true,
      appointmentDecisions: true,
      workflowSteps: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  const lookup = {
    advertisements: ['Advertisements', 'Approved adverts and publication status across district, MoPS, PSC, HCM, radio, newspaper, and SMS channels.'],
    shortlisting: ['Shortlisting Workspace', 'Independent DSC member scoring, shortlist lock, chairperson approval, and rejection reasons.'],
    interviews: ['Interview & Written Test Management', 'Panel composition, schedules, independent panelist scores, written tests, and selection outcomes.'],
    verification: ['Reference, Credential & Integrity Verification', 'NIRA, UNEB, NCHE, professional body, referee and integrity checks before appointment.'],
    appointments: ['Appointment Decisions & Letters', 'DSC decision minutes, CAO-issued appointment letters, acceptance and revocation status.'],
    onboarding: ['Onboarding & Oath Tracking', 'Oath of Allegiance, Oath of Secrecy, personal data capture, HCM push and induction enrollment.'],
    probation: ['Probation Tracking', 'Probation reminders, HoD reports, DSC confirmation, extension, or termination decisions.'],
    leave: ['Leave Management', 'Annual, sick, maternity and paternity leave routing and balance tracking.'],
    discipline: ['Discipline & Grievance Cases', 'Show-cause notices, hearings, DSC decisions, grievance handling, and PSC appeal path.'],
    payroll: ['Payroll Certification', 'Monthly DHRO payroll access certification and ghost worker controls.'],
    reports: ['Reports & Compliance', 'Quarterly DSC reports, MoPS HR returns, OAG exports, IGG dashboard and national aggregates.'],
    integrations: ['Integration Monitor', 'Mock-ready integration logs for HCM, PSC, NIRA, URA, UgPass, IFMS, UNEB, NCHE and Africa’s Talking.'],
    settings: ['Reference Data', 'Districts, DSC members, salary scales, schemes of service, job descriptions and person specifications.'],
  } as Record<string, string[]>

  const [tableTitle, tableSubtitle] = lookup[moduleKey] || ['Recruitment Cycles', '17-step DSC recruitment cycle records.']
  return moduleData(
    [
      metric('Cycles', cycles.length),
      metric('Applications', cycles.reduce((sum, item) => sum + item.applications.length, 0), 'green'),
      metric('In Workflow', cycles.filter((item) => item.status !== 'completed').length, 'orange'),
      metric('Appointments', cycles.reduce((sum, item) => sum + item.appointmentDecisions.length, 0), 'purple'),
    ],
    tableTitle,
    tableSubtitle,
    cycles.map((item) => row(item.id, item.postTitle, `${item.postRef} · step ${item.currentStep}/17 · ${item.department}`, item.status, item.createdAt)),
  )
}

function metric(title: string, value: number, color: 'blue' | 'green' | 'orange' | 'purple' = 'blue') {
  const icons = { blue: <FileText className="w-5 h-5" />, green: <CheckCircle2 className="w-5 h-5" />, orange: <AlertTriangle className="w-5 h-5" />, purple: <Clock className="w-5 h-5" /> }
  return { title, value, color, icon: icons[color], change: 'District scope', changeType: 'neutral' as const }
}

function row(id: string, title: string, description: string, status: string, date?: Date | string | null) {
  return { id, title, description, status, date: date ? new Date(date) : null }
}

function moduleData(metrics: ReturnType<typeof metric>[], tableTitle: string, tableSubtitle: string, rows: ReturnType<typeof row>[]) {
  return { metrics, tableTitle, tableSubtitle, rows }
}

function avg(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}
