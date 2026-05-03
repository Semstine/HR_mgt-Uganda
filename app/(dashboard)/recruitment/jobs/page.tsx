import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/header'
import Link from 'next/link'
import { JobStatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate } from '@/lib/utils'
import { Plus, Briefcase, Users, MapPin, Clock, ArrowRight } from 'lucide-react'
import { EMPLOYMENT_TYPE_LABELS, type EmploymentType } from '@/types'
import { cn } from '@/lib/utils'

const STATUS_ORDER = ['ACTIVE', 'PAUSED', 'DRAFT', 'CLOSED'] as const

export default async function JobsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const companyId = session.user.companyId!

  const jobs = await prisma.job.findMany({
    where: { companyId },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: {
      department: { select: { name: true } },
      _count: { select: { candidates: true } },
    },
  })

  const byStatus = {
    ACTIVE: jobs.filter(j => j.status === 'ACTIVE'),
    DRAFT:  jobs.filter(j => j.status === 'DRAFT'),
    PAUSED: jobs.filter(j => j.status === 'PAUSED'),
    CLOSED: jobs.filter(j => j.status === 'CLOSED'),
  }

  const totalCandidates = jobs.reduce((s, j) => s + j._count.candidates, 0)

  return (
    <main className="flex-1 bg-slate-50">
      <Header title="Recruitment" subtitle="Manage job openings and track applicants" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Active Positions', value: byStatus.ACTIVE.length, color: 'border-l-green-500', num: 'text-green-700', bg: 'bg-white' },
            { label: 'Draft Positions',  value: byStatus.DRAFT.length,  color: 'border-l-gray-400',  num: 'text-gray-700',  bg: 'bg-white' },
            { label: 'Total Applicants', value: totalCandidates,         color: 'border-l-blue-500',  num: 'text-blue-700',  bg: 'bg-white' },
            { label: 'Closed Positions', value: byStatus.CLOSED.length,  color: 'border-l-red-400',   num: 'text-red-600',   bg: 'bg-white' },
          ].map(s => (
            <div key={s.label} className={cn('rounded-2xl border border-gray-100 shadow-sm border-l-4 p-5', s.color, s.bg)}>
              <p className={cn('text-2xl font-bold tabular-nums', s.num)}>{s.value}</p>
              <p className="text-xs text-gray-500 font-medium mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">All Positions <span className="text-gray-400 font-normal">({jobs.length})</span></h2>
          </div>
          <Link href="/recruitment/jobs/new" className="btn-primary">
            <Plus className="w-4 h-4" /> Post New Job
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={Briefcase}
              title="No job postings yet"
              description="Create your first job opening to start receiving applications."
              action={<Link href="/recruitment/jobs/new" className="btn-primary"><Plus className="w-4 h-4" /> Post First Job</Link>}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {STATUS_ORDER.filter(s => byStatus[s].length > 0).map(status => (
              <div key={status}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn(
                    'badge',
                    status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                    status === 'DRAFT'  ? 'bg-gray-100 text-gray-600'   :
                    status === 'PAUSED' ? 'bg-yellow-100 text-yellow-700' :
                                         'bg-red-100 text-red-600'
                  )}>
                    {status}
                  </span>
                  <span className="text-xs text-gray-400">{byStatus[status].length} position{byStatus[status].length !== 1 ? 's' : ''}</span>
                </div>

                <div className="space-y-2">
                  {byStatus[status].map(job => (
                    <Link
                      key={job.id}
                      href={`/recruitment/jobs/${job.id}`}
                      className="card-hover flex items-center gap-5 p-5 group"
                    >
                      {/* Icon */}
                      <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-5 h-5 text-blue-600" strokeWidth={2} />
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{job.title}</p>
                          <JobStatusBadge status={job.status} />
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {job.department && (
                            <span className="text-xs text-gray-500 font-medium">{job.department.name}</span>
                          )}
                          <span className="badge bg-gray-100 text-gray-500 text-xs">
                            {EMPLOYMENT_TYPE_LABELS[job.employmentType as EmploymentType]}
                          </span>
                          {job.location && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <MapPin className="w-3 h-3" /> {job.location}
                            </span>
                          )}
                          {job.deadline && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock className="w-3 h-3" /> Closes {formatDate(job.deadline)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-6 flex-shrink-0">
                        <div className="text-center hidden sm:block">
                          <div className="flex items-center gap-1.5 justify-center">
                            <Users className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-sm font-bold text-gray-900">{job._count.candidates}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">applicants</p>
                        </div>
                        <div className="text-center hidden md:block">
                          <p className="text-xs font-medium text-gray-500">{formatDate(job.createdAt)}</p>
                          <p className="text-xs text-gray-400">posted</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
