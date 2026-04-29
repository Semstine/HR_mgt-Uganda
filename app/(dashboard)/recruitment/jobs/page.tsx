import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/header'
import Link from 'next/link'
import { JobStatusBadge } from '@/components/ui/status-badge'
import { formatDate } from '@/lib/utils'
import { Plus, Briefcase, Users, MapPin, Clock } from 'lucide-react'
import { EMPLOYMENT_TYPE_LABELS, type EmploymentType } from '@/types'

export default async function JobsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const companyId = session.user.companyId!

  const jobs = await prisma.job.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    include: {
      department: { select: { name: true } },
      _count: { select: { candidates: true } },
    },
  })

  const stats = {
    active: jobs.filter((j) => j.status === 'ACTIVE').length,
    draft: jobs.filter((j) => j.status === 'DRAFT').length,
    closed: jobs.filter((j) => j.status === 'CLOSED').length,
  }

  return (
    <main className="flex-1">
      <Header title="Job Openings" subtitle="Manage your recruitment positions" />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Active Positions', value: stats.active, color: 'bg-green-50 text-green-700 border-green-200' },
            { label: 'Draft Positions', value: stats.draft, color: 'bg-gray-50 text-gray-600 border-gray-200' },
            { label: 'Closed Positions', value: stats.closed, color: 'bg-red-50 text-red-700 border-red-200' },
          ].map((s) => (
            <div key={s.label} className={`card p-4 border ${s.color}`}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">All Positions ({jobs.length})</h2>
          <Link href="/recruitment/jobs/new" className="btn-primary">
            <Plus className="w-4 h-4" /> Post New Job
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div className="card p-12 text-center">
            <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No job postings yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">Create your first job opening to start receiving applications</p>
            <Link href="/recruitment/jobs/new" className="btn-primary">
              <Plus className="w-4 h-4" /> Post First Job
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <Link key={job.id} href={`/recruitment/jobs/${job.id}`}
                className="card p-5 flex items-start gap-4 hover:shadow-md transition-all group block">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">{job.title}</h3>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {job.department && (
                          <span className="text-xs text-gray-500">{job.department.name}</span>
                        )}
                        <span className="badge bg-gray-100 text-gray-600 text-xs">
                          {EMPLOYMENT_TYPE_LABELS[job.employmentType]}
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
                    <JobStatusBadge status={job.status} />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold">{job._count.candidates}</span>
                    <span className="text-gray-400 hidden sm:inline">applicants</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(job.createdAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
