import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Header from '@/components/layout/header'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Mail, Phone, MapPin, Calendar, Building2, FileText, BarChart3, Shield } from 'lucide-react'
import { EMPLOYMENT_TYPE_LABELS } from '@/types'

export default async function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    include: {
      department: { select: { name: true } },
      onboarding: true,
      documents: { orderBy: { createdAt: 'desc' } },
      performanceReviews: { orderBy: { createdAt: 'desc' }, take: 5 },
      caseFiles: { orderBy: { createdAt: 'desc' }, take: 5 },
      leaveRecords: { orderBy: { createdAt: 'desc' }, take: 5 },
      salaryHistory: { orderBy: { effectiveDate: 'desc' }, take: 5 },
    },
  })

  if (!employee || employee.companyId !== session.user.companyId) notFound()

  const onboardingProgress = employee.onboarding
    ? Math.round((employee.onboarding.completedTasks.length / 12) * 100)
    : 0

  return (
    <main className="flex-1">
      <Header title={`${employee.firstName} ${employee.lastName}`} subtitle={`${employee.jobTitle} · ${employee.department?.name || 'No department'}`} />
      <div className="p-6 space-y-5">
        {/* Profile header */}
        <div className="card p-6 flex flex-wrap gap-5 items-start">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-blue-700">{employee.firstName[0]}{employee.lastName[0]}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900">{employee.firstName} {employee.lastName}</h2>
            <p className="text-gray-500">{employee.jobTitle}</p>
            <div className="flex flex-wrap gap-4 mt-3">
              <a href={`mailto:${employee.email}`} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600">
                <Mail className="w-3.5 h-3.5" /> {employee.email}
              </a>
              {employee.phone && <span className="flex items-center gap-1.5 text-sm text-gray-600"><Phone className="w-3.5 h-3.5" /> {employee.phone}</span>}
              {employee.address && <span className="flex items-center gap-1.5 text-sm text-gray-500"><MapPin className="w-3.5 h-3.5" /> {employee.address}</span>}
              <span className="flex items-center gap-1.5 text-sm text-gray-500"><Calendar className="w-3.5 h-3.5" /> Started {formatDate(employee.startDate)}</span>
              {employee.department && <span className="flex items-center gap-1.5 text-sm text-gray-500"><Building2 className="w-3.5 h-3.5" /> {employee.department.name}</span>}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className={`badge ${employee.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {employee.isActive ? 'Active' : 'Inactive'}
            </span>
            <span className="badge bg-gray-100 text-gray-600">{EMPLOYMENT_TYPE_LABELS[employee.employmentType]}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Personal & Job Info */}
          <div className="lg:col-span-2 space-y-5">
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-600" /> Job & Contract</h3>
              <dl className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                <div><dt className="text-gray-400">Employee #</dt><dd className="font-medium mt-0.5">{employee.employeeNumber || '—'}</dd></div>
                <div><dt className="text-gray-400">Employment Type</dt><dd className="font-medium mt-0.5">{EMPLOYMENT_TYPE_LABELS[employee.employmentType]}</dd></div>
                <div><dt className="text-gray-400">Start Date</dt><dd className="font-medium mt-0.5">{formatDate(employee.startDate)}</dd></div>
                <div><dt className="text-gray-400">Supervisor</dt><dd className="font-medium mt-0.5">{employee.supervisorId || '—'}</dd></div>
                <div><dt className="text-gray-400">Annual Leave</dt><dd className="font-medium mt-0.5">{employee.annualLeave} days</dd></div>
                <div><dt className="text-gray-400">Sick Leave</dt><dd className="font-medium mt-0.5">{employee.sickLeave} days</dd></div>
              </dl>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Shield className="w-4 h-4 text-green-600" /> Payroll & HR Data</h3>
              <dl className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                <div><dt className="text-gray-400">Salary</dt><dd className="font-medium mt-0.5">{employee.salary ? formatCurrency(employee.salary, employee.currency) : '—'}</dd></div>
                <div><dt className="text-gray-400">Payment Freq.</dt><dd className="font-medium mt-0.5">{employee.paymentFrequency || '—'}</dd></div>
                <div><dt className="text-gray-400">NSSF No.</dt><dd className="font-medium mt-0.5">{employee.nssfNumber || '—'}</dd></div>
                <div><dt className="text-gray-400">TIN (PAYE)</dt><dd className="font-medium mt-0.5">{employee.tinNumber || '—'}</dd></div>
                <div><dt className="text-gray-400">Bank</dt><dd className="font-medium mt-0.5">{employee.bankName || '—'}</dd></div>
                <div><dt className="text-gray-400">Account No.</dt><dd className="font-medium mt-0.5">{employee.bankAccount ? '****' + employee.bankAccount.slice(-4) : '—'}</dd></div>
              </dl>
            </div>

            {/* Performance Reviews */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-purple-600" /> Performance Reviews</h3>
                <Link href={`/performance?employee=${employee.id}`} className="text-xs text-blue-600 hover:underline">View all</Link>
              </div>
              {employee.performanceReviews.length === 0 ? (
                <p className="text-sm text-gray-400">No reviews yet</p>
              ) : (
                <div className="space-y-2">
                  {employee.performanceReviews.map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-lg">
                      <span className="font-medium">{r.period}</span>
                      <div className="flex items-center gap-2">
                        {r.overallScore && <span className="font-bold text-blue-600">{r.overallScore.toFixed(0)}%</span>}
                        <span className={`badge text-xs ${r.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{r.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Onboarding */}
            {employee.onboarding && (
              <div className="card p-5">
                <h3 className="font-semibold text-gray-800 mb-3">Onboarding</h3>
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Progress</span>
                    <span className="font-semibold">{onboardingProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-2 bg-blue-500 rounded-full transition-all" style={{ width: `${onboardingProgress}%` }} />
                  </div>
                </div>
                <span className={`badge ${employee.onboarding.status === 'complete' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {employee.onboarding.status}
                </span>
              </div>
            )}

            {/* Documents */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2"><FileText className="w-4 h-4 text-teal-600" /> Documents</h3>
                <button className="text-xs text-blue-600 hover:underline">Upload</button>
              </div>
              {employee.documents.length === 0 ? (
                <p className="text-sm text-gray-400">No documents</p>
              ) : (
                <div className="space-y-2">
                  {employee.documents.map((doc) => (
                    <a key={doc.id} href={doc.url} target="_blank"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:underline p-2 hover:bg-gray-50 rounded">
                      <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{doc.name}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Leave */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Leave Records</h3>
              {employee.leaveRecords.length === 0 ? (
                <p className="text-sm text-gray-400">No leave records</p>
              ) : (
                <div className="space-y-2">
                  {employee.leaveRecords.map((l) => (
                    <div key={l.id} className="text-sm p-2 bg-gray-50 rounded">
                      <div className="flex justify-between">
                        <span className="font-medium capitalize">{l.leaveType} leave</span>
                        <span className={`badge text-xs ${l.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{l.status}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(l.startDate)} – {formatDate(l.endDate)} ({l.days} days)</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
