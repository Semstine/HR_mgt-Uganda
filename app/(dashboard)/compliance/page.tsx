import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/header'
import { formatDate } from '@/lib/utils'
import { COMPLIANCE_TYPE_LABELS } from '@/types'
import type { ComplianceType } from '@/types'
import { ShieldCheck, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  compliant: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  overdue: 'bg-red-100 text-red-700',
  waived: 'bg-gray-100 text-gray-500',
}

export default async function CompliancePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const records = await prisma.complianceRecord.findMany({
    where: { companyId: session.user.companyId! },
    include: {
      employee: { select: { firstName: true, lastName: true, jobTitle: true, employeeNumber: true } },
    },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
  })

  const stats = {
    overdue: records.filter((r) => r.status === 'overdue').length,
    pending: records.filter((r) => r.status === 'pending').length,
    compliant: records.filter((r) => r.status === 'compliant').length,
    total: records.length,
  }

  // Auto-mark overdue items
  const now = new Date()
  const overdueIds = records
    .filter((r) => r.status === 'pending' && r.dueDate && new Date(r.dueDate) < now)
    .map((r) => r.id)
  if (overdueIds.length > 0) {
    await prisma.complianceRecord.updateMany({
      where: { id: { in: overdueIds } },
      data: { status: 'overdue' },
    })
  }

  return (
    <main className="flex-1">
      <Header title="Compliance" subtitle="Uganda HR compliance tracking — NSSF, PAYE, contracts, and more" />
      <div className="p-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: 'bg-red-50 border-red-200 text-red-700' },
            { label: 'Pending', value: stats.pending, icon: Clock, color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
            { label: 'Compliant', value: stats.compliant, icon: CheckCircle2, color: 'bg-green-50 border-green-200 text-green-700' },
            { label: 'Total Items', value: stats.total, icon: ShieldCheck, color: 'bg-blue-50 border-blue-200 text-blue-700' },
          ].map((s) => (
            <div key={s.label} className={`card p-4 border ${s.color}`}>
              <div className="flex items-center gap-2 mb-1">
                <s.icon className="w-4 h-4" />
                <p className="text-sm">{s.label}</p>
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Overdue alert */}
        {stats.overdue > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">{stats.overdue} compliance item{stats.overdue > 1 ? 's are' : ' is'} overdue</p>
              <p className="text-xs text-red-600 mt-0.5">Review and resolve to stay compliant with Uganda Employment Act requirements.</p>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
          <p className="text-xs text-blue-700">
            <strong>Note:</strong> This module provides reminders and record-keeping only. It does not constitute legal advice.
            Consult a qualified HR or legal professional for compliance decisions.
          </p>
        </div>

        {/* Records table */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Compliance Records ({records.length})</h2>
          </div>
          {records.length === 0 ? (
            <div className="p-12 text-center">
              <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No compliance records yet</p>
              <p className="text-sm text-gray-400 mt-1">Records are created automatically as employees are added</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {records.map((r) => (
                <div key={r.id} className="p-4 flex items-start gap-4 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{r.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400">
                            {COMPLIANCE_TYPE_LABELS[r.type as ComplianceType] ?? r.type}
                          </span>
                          {r.employee && (
                            <>
                              <span className="text-gray-300">·</span>
                              <span className="text-xs text-gray-500">
                                {r.employee.firstName} {r.employee.lastName} ({r.employee.employeeNumber})
                              </span>
                            </>
                          )}
                        </div>
                        {r.description && <p className="text-xs text-gray-400 mt-1">{r.description}</p>}
                      </div>
                      <span className={`badge text-xs flex-shrink-0 ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </span>
                    </div>
                    {r.dueDate && (
                      <p className="text-xs text-gray-400 mt-2">Due: {formatDate(new Date(r.dueDate))}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
