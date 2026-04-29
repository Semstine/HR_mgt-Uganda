import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Header from '@/components/layout/header'
import Link from 'next/link'
import { JobStatusBadge, CandidateStatusBadge, ScoreBadge } from '@/components/ui/status-badge'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Users, MapPin, Clock, ExternalLink, Sparkles } from 'lucide-react'
import { EMPLOYMENT_TYPE_LABELS } from '@/types'

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      department: { select: { name: true } },
      candidates: {
        orderBy: [{ screeningScore: 'desc' }, { applicationDate: 'desc' }],
        select: { id: true, firstName: true, lastName: true, email: true, status: true, screeningScore: true, applicationDate: true },
      },
      _count: { select: { candidates: true } },
    },
  })

  if (!job || job.companyId !== session.user.companyId) notFound()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const publicLink = job.publicSlug ? `${appUrl}/apply/${job.publicSlug}` : null

  return (
    <main className="flex-1">
      <Header title={job.title} subtitle={`${job.department?.name || 'No department'} · ${EMPLOYMENT_TYPE_LABELS[job.employmentType]}`} />
      <div className="p-6 space-y-5">
        {/* Header card */}
        <div className="card p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-3 items-center mb-2">
                <JobStatusBadge status={job.status} />
                {job.location && <span className="flex items-center gap-1 text-sm text-gray-400"><MapPin className="w-3.5 h-3.5" /> {job.location}</span>}
                {job.deadline && <span className="flex items-center gap-1 text-sm text-gray-400"><Clock className="w-3.5 h-3.5" /> Closes {formatDate(job.deadline)}</span>}
                {job.salaryMin && <span className="text-sm text-gray-500">{formatCurrency(job.salaryMin, job.currency)} – {formatCurrency(job.salaryMax ?? 0, job.currency)}/month</span>}
              </div>
              {publicLink && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-gray-400">Public link:</span>
                  <a href={publicLink} target="_blank" className="flex items-center gap-1 text-xs text-blue-600 hover:underline break-all">
                    {publicLink} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {job.status === 'DRAFT' && (
                <button className="btn-primary text-sm">Publish Job</button>
              )}
              <Link href={`/recruitment/jobs/${job.id}/edit`} className="btn-secondary text-sm">Edit</Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {job.description && (
              <div className="card p-5">
                <h3 className="font-semibold mb-3">Description</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.description}</p>
              </div>
            )}
            {job.responsibilities && (
              <div className="card p-5">
                <h3 className="font-semibold mb-3">Responsibilities</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.responsibilities}</p>
              </div>
            )}

            {/* AI Criteria */}
            {job.aiApproved && job.interviewQuestions.length > 0 && (
              <div className="card p-5 border-l-4 border-purple-400">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <h3 className="font-semibold text-purple-900">AI Interview Questions</h3>
                </div>
                <ol className="space-y-2">
                  {job.interviewQuestions.map((q, i) => (
                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-purple-600 font-medium">{i + 1}.</span> {q}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="card p-5">
              <h3 className="font-semibold mb-3">Details</h3>
              <dl className="space-y-2 text-sm">
                <div><dt className="text-gray-400">Experience</dt><dd className="font-medium mt-0.5">{job.experienceLevel || '—'}</dd></div>
                <div><dt className="text-gray-400">Education</dt><dd className="font-medium mt-0.5">{job.education || '—'}</dd></div>
              </dl>
            </div>
            {job.requiredSkills.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold mb-3">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {job.requiredSkills.map((s) => <span key={s} className="badge bg-blue-50 text-blue-700">{s}</span>)}
                </div>
              </div>
            )}
            {job.preferredSkills.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold mb-3">Preferred Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {job.preferredSkills.map((s) => <span key={s} className="badge bg-gray-100 text-gray-600">{s}</span>)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Candidates */}
        <div className="card">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" /> Candidates ({job._count.candidates})
            </h3>
            <Link href={`/recruitment/candidates?job=${job.id}`} className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          {job.candidates.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">No candidates yet. Share the public application link to start receiving applications.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Candidate</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">AI Score</th>
                    <th className="table-header">Applied</th>
                    <th className="table-header"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {job.candidates.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-semibold text-blue-700">{c.firstName[0]}{c.lastName[0]}</span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{c.firstName} {c.lastName}</p>
                            <p className="text-xs text-gray-400">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell"><CandidateStatusBadge status={c.status} /></td>
                      <td className="table-cell"><ScoreBadge score={c.screeningScore} /></td>
                      <td className="table-cell text-gray-400 text-sm">{formatDate(c.applicationDate)}</td>
                      <td className="table-cell">
                        <Link href={`/recruitment/candidates/${c.id}`} className="text-sm text-blue-600 hover:underline">View →</Link>
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
