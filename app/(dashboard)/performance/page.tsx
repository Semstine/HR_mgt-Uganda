import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/header'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { BarChart3, Plus, Clock } from 'lucide-react'

export default async function PerformancePage({ searchParams }: { searchParams: { status?: string; employee?: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const companyId = session.user.companyId!

  const reviews = await prisma.performanceReview.findMany({
    where: {
      employee: { companyId },
      ...(searchParams.status ? { status: searchParams.status as never } : {}),
      ...(searchParams.employee ? { employeeId: searchParams.employee } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: { employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true, department: { select: { name: true } } } } },
  })

  const stats = {
    pending: reviews.filter((r) => r.status === 'PENDING').length,
    inProgress: reviews.filter((r) => r.status === 'IN_PROGRESS').length,
    completed: reviews.filter((r) => r.status === 'COMPLETED').length,
    avgScore: reviews.filter((r) => r.overallScore).reduce((acc, r) => acc + (r.overallScore || 0), 0) / Math.max(reviews.filter((r) => r.overallScore).length, 1),
  }

  return (
    <main className="flex-1">
      <Header title="Performance Reviews" subtitle="Manage employee evaluation cycles" />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Pending', value: stats.pending, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
            { label: 'In Progress', value: stats.inProgress, color: 'bg-blue-50 text-blue-700 border-blue-200' },
            { label: 'Completed', value: stats.completed, color: 'bg-green-50 text-green-700 border-green-200' },
            { label: 'Avg Score', value: `${stats.avgScore.toFixed(0)}%`, color: 'bg-purple-50 text-purple-700 border-purple-200' },
          ].map((s) => (
            <div key={s.label} className={`card p-4 border ${s.color}`}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">All Reviews ({reviews.length})</h2>
          <Link href="/performance/new" className="btn-primary"><Plus className="w-4 h-4" /> Start Review</Link>
        </div>

        {reviews.length === 0 ? (
          <div className="card p-12 text-center">
            <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 mb-3">No performance reviews yet</p>
            <Link href="/performance/new" className="btn-primary"><Plus className="w-4 h-4" /> Start First Review</Link>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Employee</th>
                    <th className="table-header">Period</th>
                    <th className="table-header">Cycle</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Score</th>
                    <th className="table-header">Due Date</th>
                    <th className="table-header"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {reviews.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-semibold text-purple-700">{r.employee.firstName[0]}{r.employee.lastName[0]}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{r.employee.firstName} {r.employee.lastName}</p>
                            <p className="text-xs text-gray-400">{r.employee.jobTitle}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-gray-600">{r.period}</td>
                      <td className="table-cell">
                        <span className="badge bg-indigo-50 text-indigo-700 capitalize">{r.cycle.toLowerCase().replace(/_/g, '-')}</span>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${r.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : r.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {r.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="table-cell">
                        {r.overallScore ? (
                          <span className={`font-semibold ${r.overallScore >= 80 ? 'text-green-600' : r.overallScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {r.overallScore.toFixed(0)}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(r.dueDate)}
                        </div>
                      </td>
                      <td className="table-cell">
                        <Link href={`/performance/${r.id}`} className="text-sm text-blue-600 hover:underline font-medium">View →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
