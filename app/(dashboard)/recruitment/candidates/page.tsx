import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/header'
import Link from 'next/link'
import { CandidateStatusBadge, ScoreBadge } from '@/components/ui/status-badge'
import { formatDate } from '@/lib/utils'
import { Users, Filter } from 'lucide-react'

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
    prisma.job.findMany({ where: { companyId }, select: { id: true, title: true } }),
  ])

  const statusGroups = {
    RECEIVED: 0, UNDER_REVIEW: 0, SHORTLISTED: 0, REJECTED: 0,
    PHONE_INTERVIEW_INVITED: 0, INTERVIEW_SCHEDULED: 0, FINAL_INTERVIEW: 0,
    OFFER_SENT: 0, OFFER_ACCEPTED: 0,
  }
  candidates.forEach((c) => { if (c.status in statusGroups) (statusGroups as Record<string, number>)[c.status]++ })

  return (
    <main className="flex-1">
      <Header title="Candidates" subtitle="Review and manage all job applicants" />
      <div className="p-6 space-y-5">
        {/* Pipeline Summary */}
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Filter className="w-3.5 h-3.5" /> Hiring Pipeline</p>
          <div className="grid grid-cols-4 md:grid-cols-9 gap-2">
            {Object.entries(statusGroups).map(([status, count]) => (
              <Link key={status} href={`/recruitment/candidates?status=${status}`}
                className={`text-center p-2 rounded-lg hover:bg-blue-50 transition-colors ${searchParams.status === status ? 'bg-blue-50 ring-2 ring-blue-300' : ''}`}>
                <p className="text-lg font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500 leading-tight mt-0.5">{status.replace(/_/g, ' ').toLowerCase()}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Filters */}
        <form method="GET" className="flex gap-3 flex-wrap">
          <input name="q" defaultValue={searchParams.q} className="input w-56" placeholder="Search candidates…" />
          <select name="job" defaultValue={searchParams.job} className="select w-52">
            <option value="">All positions</option>
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
          <select name="status" defaultValue={searchParams.status} className="select w-52">
            <option value="">All statuses</option>
            {Object.keys(statusGroups).map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          <button type="submit" className="btn-secondary">Filter</button>
          {(searchParams.status || searchParams.job || searchParams.q) && (
            <Link href="/recruitment/candidates" className="btn-secondary">Clear</Link>
          )}
        </form>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" /> {candidates.length} candidates
            </p>
          </div>
          {candidates.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">No candidates found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Candidate</th>
                    <th className="table-header">Position</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">AI Score</th>
                    <th className="table-header">Applied</th>
                    <th className="table-header"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {candidates.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-blue-700">{c.firstName[0]}{c.lastName[0]}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{c.firstName} {c.lastName}</p>
                            <p className="text-xs text-gray-400">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-gray-600">{c.job.title}</td>
                      <td className="table-cell"><CandidateStatusBadge status={c.status} /></td>
                      <td className="table-cell"><ScoreBadge score={c.screeningScore} /></td>
                      <td className="table-cell text-gray-400">{formatDate(c.applicationDate)}</td>
                      <td className="table-cell">
                        <Link href={`/recruitment/candidates/${c.id}`}
                          className="text-sm text-blue-600 hover:underline font-medium">
                          View →
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
