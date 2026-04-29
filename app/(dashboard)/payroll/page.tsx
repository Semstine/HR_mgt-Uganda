import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/header'
import { formatDate } from '@/lib/utils'
import { CONTRACT_TYPE_LABELS } from '@/types'
import type { ContractType } from '@/types'
import { DollarSign, Clock, CheckCircle, AlertCircle } from 'lucide-react'

export default async function PayrollPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const settings = await prisma.companySettings.findUnique({
    where: { companyId: session.user.companyId! },
  })
  const currency = settings?.currency ?? 'UGX'

  const [employees, pendingChanges] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId: session.user.companyId!, isActive: true },
      include: {
        department: { select: { name: true } },
        salaryHistory: { orderBy: { effectiveDate: 'desc' }, take: 1 },
        compensationChanges: { where: { status: 'pending' }, take: 1 },
      },
      orderBy: { firstName: 'asc' },
    }),
    prisma.compensationChange.findMany({
      where: { employee: { companyId: session.user.companyId! }, status: 'pending' },
      include: {
        employee: { select: { firstName: true, lastName: true, jobTitle: true, employeeNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const totalPayroll = employees.reduce((sum, e) => sum + (e.salary ?? 0), 0)
  const nssfTotal = employees.reduce((sum, e) => sum + (e.salary ?? 0) * ((e.nssfRate ?? 10) / 100), 0)

  return (
    <main className="flex-1">
      <Header title="Payroll Records" subtitle="Salary data, compensation changes, and payroll-ready export" />
      <div className="p-6 space-y-5">

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Payroll', value: `${currency} ${totalPayroll.toLocaleString()}`, icon: DollarSign, color: 'bg-blue-50 border-blue-200 text-blue-700' },
            { label: 'NSSF Contribution (Est.)', value: `${currency} ${Math.round(nssfTotal).toLocaleString()}`, icon: DollarSign, color: 'bg-purple-50 border-purple-200 text-purple-700' },
            { label: 'Pending Changes', value: pendingChanges.length, icon: Clock, color: pendingChanges.length > 0 ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-gray-50 border-gray-200 text-gray-600' },
            { label: 'Active Employees', value: employees.length, icon: CheckCircle, color: 'bg-green-50 border-green-200 text-green-700' },
          ].map((s) => (
            <div key={s.label} className={`card p-4 border ${s.color}`}>
              <div className="flex items-center gap-2 mb-1">
                <s.icon className="w-4 h-4" />
                <p className="text-sm">{s.label}</p>
              </div>
              <p className="text-xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Pending changes */}
        {pendingChanges.length > 0 && (
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <h2 className="font-semibold text-gray-800">Pending Compensation Changes</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {pendingChanges.map((c) => (
                <div key={c.id} className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-sm text-gray-900">
                      {c.employee.firstName} {c.employee.lastName}
                      <span className="text-gray-400 ml-2 text-xs">{c.employee.employeeNumber}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {c.changeType.charAt(0).toUpperCase() + c.changeType.slice(1)} change:
                      {c.fromAmount !== null && ` ${currency} ${c.fromAmount.toLocaleString()} →`} {currency} {c.toAmount.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">Reason: {c.reason} · Effective {formatDate(new Date(c.effectiveDate))}</p>
                  </div>
                  <div className="flex gap-2">
                    <ApproveButton changeId={c.id} action="approve" />
                    <ApproveButton changeId={c.id} action="reject" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Employee salary table */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Employee Compensation ({employees.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Emp #', 'Name', 'Department', 'Job Title', 'Contract', 'Gross Salary', 'NSSF', 'TIN', 'Bank', 'Last Change'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {employees.map((e) => {
                  const nssf = (e.salary ?? 0) * ((e.nssfRate ?? 10) / 100)
                  return (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 text-xs">{e.employeeNumber}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{e.firstName} {e.lastName}</td>
                      <td className="px-4 py-3 text-gray-500">{e.department?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{e.jobTitle}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {e.contractType ? CONTRACT_TYPE_LABELS[e.contractType as ContractType] ?? e.contractType : '—'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {e.salary ? `${currency} ${e.salary.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{e.salary ? `${currency} ${Math.round(nssf).toLocaleString()}` : '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{e.tinNumber ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{e.bankName ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {e.salaryHistory[0] ? formatDate(new Date(e.salaryHistory[0].effectiveDate)) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center">
          NSSF employee contribution estimated at {employees[0]?.nssfRate ?? 5}% of gross salary. PAYE calculations require URA rate tables — consult your accountant.
        </p>
      </div>
    </main>
  )
}

function ApproveButton({ changeId, action }: { changeId: string; action: 'approve' | 'reject' }) {
  return (
    <form action={`/api/compensation/${changeId}/approve`} method="POST">
      <input type="hidden" name="action" value={action} />
      <button
        type="submit"
        className={action === 'approve' ? 'btn-primary text-xs py-1 px-3' : 'btn-secondary text-xs py-1 px-3'}
      >
        {action === 'approve' ? 'Approve' : 'Reject'}
      </button>
    </form>
  )
}
