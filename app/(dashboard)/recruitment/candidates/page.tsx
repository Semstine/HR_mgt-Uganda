import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/header'
import Link from 'next/link'
import { CandidateStatusBadge, ScoreBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate } from '@/lib/utils'
import { Users, Search, ArrowRight, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

const PIPELINE_STAGES = [
  { key: 'RECEIVED',              label: 'Received',        color: 'bg-gray-400' },
  { key: 'UNDER_REVIEW',         label: 'Under Review',    color: 'bg-blue-500' },
  { key: 'SHORTLISTED',          label: 'Shortlisted',     color: 'bg-indigo-500' },
  { key: 'PHONE_INTERVIEW_INVITED', label: 'Phone Screen', color: 'bg-purple-500' },
  { key: 'INTERVIEW_SCHEDULED',  label: 'Interview',       color: 'bg-violet-500' },
  { key: 'FINAL_INTERVIEW',      label: 'Final Round',     color: 'bg-orange-500' },
  { key: 'OFFER_SENT',           label: 'Offer Sent',      color: 'bg-amber-500' },
  { key: 'OFFER_ACCEPTED',       label: 'Accepted',        color: 'bg-green-500' },
  { key: 'REJECTED',             label: 'Rejected',        color: 'bg-red-400' },
]

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: { status?: string; job?: string; q?: string }
}) {
  const session = await getSession()
  if (!session) redirect('/login')
  const companyId = session.user.companyId!

  const where = {
    job: { companyId },
    ...(searchParams.status ? { status: searchParams.status as never } : {}),
    ...(searchParams.job ? { jobId: searchParams.job } : {}),
    ...(searchParams.q ? {
      OR: [
        { firstName: { contains: searchParams.q, mode: 'insensitive' as const } },
        { lastName: { contains: searchParams.q, mode: 'insensitive' as const } },
        { email: { contains: searchParams.q, mode: 'insensitive' as const } },
      ],
    } : {}),
  }

  const [candidates, jobs] = await Promise.all([
    prisma.candidate.findMany({
      where,
      orderBy: { applicationDate: 'desc' },
      include: { job: { select: { title: true, id: true } } },
    }),
    prisma.job.findMany({ where: { companyId }, select: { id: true, title: true }, orderBy: { title: 'asc' } }),
  ])

  const counts: Record<string, number> = {}
  PIPELINE_STAGES.forEach(s => { counts[s.key] = 0 })
  candidates.forEach(c => { if (counts[c.status] !== undefined) counts[c.status]++ })

  const total = candidates.length
  const hasFilters = !!(searchParams.status || searchParams.job || searchParams.q)

  return (
    <main className="flex-1 bg-slate-50">
      <Header title="Candidates" subtitle="Review and manage all job applicants" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Pipeline funnel */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-gray-400" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hiring Pipeline</p>
            <span className="badge bg-gray-100 text-gray-600 ml-auto">{total} total</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
            {PIPELINE_STAGES.map(stage => {
              const count = counts[stage.key] || 0
              const active = searchParams.status === stage.key
              return (
                <Link
                  key={stage.key}
                  href={active ? '/recruitment/candidates' : `/recruitment/candidates?status=${stage.key}`}
                  className={cn(
                    'relative text-center p-3 rounded-xl border transition-all duration-150 hover:shadow-sm',
                    active
                      ? 'border-blue-200 bg-blue-50 shadow-sm'
                      : 'border-gray-100 bg-white hover:border-gray-200',
                  )}
                >
                  <div className={cn('w-2 h-2 rounded-full mx-auto mb-2', stage.color)} />
                  <p className={cn('text-lg font-bold tabular-nums', active ? 'text-blue-700' : count > 0 ? 'text-gray-900' : 'text-gray-300')}>
                    {count}
                  </p>
                  <p className="text-xs text-gray-400 leading-tight mt-0.5 font-medium">{stage.label}</p>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Search + filters */}
        <form method="GET" className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              name="q"
              defaultValue={searchParams.q}
              className="input pl-9"
              placeholder="Search by name or email…"
            />
          </div>
          <select name="job" defaultValue={searchParams.job} className="select w-52">
            <option value="">All positions</option>
            {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
          <select name="status" defaultValue={searchParams.status} className="select w-48">
            <option value="">All statuses</option>
            {PIPELINE_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button type="submit" className="btn-secondary">Apply</button>
          {hasFilters && (
            <Link href="/recruitment/candidates" className="btn-ghost text-sm">Clear filters</Link>
          )}
        </form>

        {/* Results */}
        <div className="card overflow-hidden">
          {/* Table header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-slate-50">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}
              {hasFilters && <span className="text-blue-600">(filtered)</span>}
            </p>
          </div>

          {candidates.length === 0 ? (
            <EmptyState
              icon={Users}
              title={hasFilters ? 'No candidates match your filters' : 'No candidates yet'}
              description={hasFilters ? 'Try adjusting your search or clearing the filters.' : 'Candidates will appear here once they apply for your job openings.'}
              action={hasFilters ? <Link href="/recruitment/candidates" className="btn-secondary">Clear filters</Link> : undefined}
              size="md"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">Candidate</th>
                    <th className="table-header">Position</th>
                    <th className="table-header">Status</th>
                    <th className="table-header hidden sm:table-cell">AI Score</th>
                    <th className="table-header hidden md:table-cell">Applied</th>
                    <th className="table-header w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.id} className="table-row group relative">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0 border border-blue-100">
                            <span className="text-xs font-bold text-blue-700">
                              {c.firstName[0]}{c.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm group-hover:text-blue-700 transition-colors">
                              {c.firstName} {c.lastName}
                            </p>
                            <p className="text-xs text-gray-400">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <p className="text-sm text-gray-600 font-medium">{c.job.title}</p>
                      </td>
                      <td className="table-cell">
                        <CandidateStatusBadge status={c.status} />
                      </td>
                      <td className="table-cell hidden sm:table-cell">
                        <ScoreBadge score={c.screeningScore} />
                      </td>
                      <td className="table-cell hidden md:table-cell text-gray-400 text-xs">
                        {formatDate(c.applicationDate)}
                      </td>
                      <td className="table-cell">
                        <Link
                          href={`/recruitment/candidates/${c.id}`}
                          className="btn-icon after:absolute after:inset-0 after:content-['']"
                          aria-label="View candidate"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
