import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/header'
import Link from 'next/link'
import { DEFAULT_ONBOARDING_TASKS } from '@/types'
import { ClipboardList, CheckCircle2, Circle } from 'lucide-react'

export default async function OnboardingPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const companyId = session.user.companyId!

  const onboardings = await prisma.onboarding.findMany({
    where: { employee: { companyId } },
    orderBy: { createdAt: 'desc' },
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, jobTitle: true, startDate: true, department: { select: { name: true } } },
      },
    },
  })

  const stats = {
    total: onboardings.length,
    complete: onboardings.filter((o) => o.status === 'complete').length,
    inProgress: onboardings.filter((o) => o.status === 'in-progress').length,
    pending: onboardings.filter((o) => o.status === 'pending').length,
  }

  function getProgress(o: typeof onboardings[0]) {
    return Math.round((o.completedTasks.length / DEFAULT_ONBOARDING_TASKS.length) * 100)
  }

  return (
    <main className="flex-1">
      <Header title="Employee Onboarding" subtitle="Track new employee onboarding progress" />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'bg-blue-50 text-blue-700' },
            { label: 'Complete', value: stats.complete, color: 'bg-green-50 text-green-700' },
            { label: 'In Progress', value: stats.inProgress, color: 'bg-yellow-50 text-yellow-700' },
            { label: 'Not Started', value: stats.pending, color: 'bg-gray-50 text-gray-600' },
          ].map((s) => (
            <div key={s.label} className={`card p-4 ${s.color}`}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {onboardings.length === 0 ? (
            <div className="card p-12 text-center">
              <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">No employees in onboarding yet</p>
              <p className="text-sm text-gray-400 mt-1">Onboarding starts automatically when an offer is accepted</p>
            </div>
          ) : onboardings.map((o) => {
            const progress = getProgress(o)
            return (
              <Link key={o.id} href={`/onboarding/${o.id}`}
                className="card p-5 flex items-start gap-4 hover:shadow-md transition-all block">
                <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-teal-700">{o.employee.firstName[0]}{o.employee.lastName[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{o.employee.firstName} {o.employee.lastName}</p>
                      <p className="text-sm text-gray-500">{o.employee.jobTitle} · {o.employee.department?.name}</p>
                    </div>
                    <span className={`badge ${o.status === 'complete' ? 'bg-green-100 text-green-700' : o.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                      {o.status}
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{o.completedTasks.length} / {DEFAULT_ONBOARDING_TASKS.length} tasks complete</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-1.5 bg-teal-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div className="flex gap-4 mt-3">
                    {[
                      { key: 'personalInfoComplete', label: 'Personal info' },
                      { key: 'contractSigned', label: 'Contract signed' },
                      { key: 'bankDetailsComplete', label: 'Bank details' },
                      { key: 'policiesAcknowledged', label: 'Policies' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-1 text-xs">
                        {o[key as keyof typeof o] ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-gray-300" />
                        )}
                        <span className={o[key as keyof typeof o] ? 'text-green-700' : 'text-gray-400'}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </main>
  )
}
