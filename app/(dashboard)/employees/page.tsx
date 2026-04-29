import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/header'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'
import { UserCheck, Plus, Search } from 'lucide-react'
import { EMPLOYMENT_TYPE_LABELS } from '@/types'

export default async function EmployeesPage({ searchParams }: { searchParams: { q?: string; dept?: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const companyId = session.user.companyId!

  const [employees, departments] = await Promise.all([
    prisma.employee.findMany({
      where: {
        companyId,
        isActive: true,
        ...(searchParams.dept ? { departmentId: searchParams.dept } : {}),
        ...(searchParams.q ? {
          OR: [
            { firstName: { contains: searchParams.q, mode: 'insensitive' } },
            { lastName: { contains: searchParams.q, mode: 'insensitive' } },
            { jobTitle: { contains: searchParams.q, mode: 'insensitive' } },
            { email: { contains: searchParams.q, mode: 'insensitive' } },
          ],
        } : {}),
      },
      orderBy: [{ department: { name: 'asc' } }, { firstName: 'asc' }],
      include: {
        department: { select: { name: true } },
        onboarding: { select: { status: true } },
      },
    }),
    prisma.department.findMany({ where: { companyId }, select: { id: true, name: true } }),
  ])

  return (
    <main className="flex-1">
      <Header title="Employees" subtitle="Manage your workforce" />
      <div className="p-6 space-y-5">
        {/* Filters */}
        <form method="GET" className="flex gap-3 flex-wrap items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input name="q" defaultValue={searchParams.q} className="input pl-9 w-56" placeholder="Search employees…" />
          </div>
          <select name="dept" defaultValue={searchParams.dept} className="select w-48">
            <option value="">All departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button type="submit" className="btn-secondary">Filter</button>
          <div className="flex-1" />
          <Link href="/employees/new" className="btn-primary"><Plus className="w-4 h-4" /> Add Employee</Link>
        </form>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {departments.slice(0, 4).map((d) => {
            const count = employees.filter((e) => e.departmentId === d.id).length
            return (
              <div key={d.id} className="card p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500 mt-0.5">{d.name}</p>
              </div>
            )
          })}
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-gray-400" /> {employees.length} active employees
            </p>
          </div>
          {employees.length === 0 ? (
            <div className="p-12 text-center">
              <UserCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 mb-3">No employees found</p>
              <Link href="/employees/new" className="btn-primary"><Plus className="w-4 h-4" /> Add Employee</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Employee</th>
                    <th className="table-header">Department</th>
                    <th className="table-header">Job Title</th>
                    <th className="table-header">Type</th>
                    <th className="table-header">Start Date</th>
                    <th className="table-header">Onboarding</th>
                    <th className="table-header"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-blue-700">{emp.firstName[0]}{emp.lastName[0]}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{emp.firstName} {emp.lastName}</p>
                            <p className="text-xs text-gray-400">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-gray-600">{emp.department?.name || '—'}</td>
                      <td className="table-cell text-gray-600">{emp.jobTitle}</td>
                      <td className="table-cell">
                        <span className="badge bg-gray-100 text-gray-600">{EMPLOYMENT_TYPE_LABELS[emp.employmentType]}</span>
                      </td>
                      <td className="table-cell text-gray-500">{formatDate(emp.startDate)}</td>
                      <td className="table-cell">
                        {emp.onboarding ? (
                          <span className={`badge ${emp.onboarding.status === 'complete' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {emp.onboarding.status}
                          </span>
                        ) : <span className="badge bg-gray-100 text-gray-400">Not started</span>}
                      </td>
                      <td className="table-cell">
                        <Link href={`/employees/${emp.id}`} className="text-sm text-blue-600 hover:underline font-medium">View →</Link>
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
