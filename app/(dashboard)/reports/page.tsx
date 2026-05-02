'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { BarChart3, Users, AlertTriangle, FileText, Download } from 'lucide-react'

type Tab = 'overview' | 'affirmative' | 'fraud' | 'statutory'

export default function ReportsPage() {
  const { data: session } = useSession()
  const [tab, setTab] = useState<Tab>('overview')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  async function load(t: Tab) {
    setLoading(true)
    const res = await fetch(`/api/dsc/reports?type=${t === 'overview' ? 'overview' : t === 'affirmative' ? 'affirmative_action' : t === 'fraud' ? 'fraud' : 'statutory'}`)
    setData((await res.json()).data)
    setLoading(false)
  }

  useEffect(() => { load(tab) }, [tab])

  const tabs: { key: Tab; label: string; Icon: React.ComponentType<any> }[] = [
    { key: 'overview', label: 'District Dashboard', Icon: BarChart3 },
    { key: 'affirmative', label: 'Affirmative Action', Icon: Users },
    { key: 'fraud', label: 'Fraud Dashboard', Icon: AlertTriangle },
    { key: 'statutory', label: 'Statutory Reports', Icon: FileText },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="page-header">
        <div>
          <h1>Reports & Compliance</h1>
          <p className="text-sm text-gray-500 mt-1">District-level analytics, statutory reports, and fraud oversight</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {tabs.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setTab(key)} className={cn('flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap', tab === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700')}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-16 text-gray-400">Loading…</div> : (
        <>
          {tab === 'overview' && data && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Recruitment Cycles', value: data.cycles, color: 'bg-blue-50 text-blue-700' },
                  { label: 'Applications', value: data.applications, color: 'bg-indigo-50 text-indigo-700' },
                  { label: 'Staff Records', value: data.employees, color: 'bg-emerald-50 text-emerald-700' },
                  { label: 'Pending Leave', value: data.leaves, color: 'bg-amber-50 text-amber-700' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="card p-5 text-center">
                    <p className={cn('text-3xl font-bold', color.split(' ')[1])}>{value ?? 0}</p>
                    <p className="text-xs text-gray-500 mt-1">{label}</p>
                  </div>
                ))}
              </div>
              <div className="card p-5">
                <h3 className="mb-4">Financial Year: {data.financialYear}</h3>
                <p className="text-sm text-gray-500">Detailed recruitment analytics and pipeline reports will appear here as data accumulates.</p>
              </div>
            </div>
          )}

          {tab === 'affirmative' && data && (
            <div className="space-y-6">
              <div className="card p-5">
                <h3 className="mb-4">Gender Distribution (Staff)</h3>
                <div className="space-y-3">
                  {(data.genderBreakdown || []).map((g: any) => {
                    const total = data.genderBreakdown.reduce((s: number, x: any) => s + x._count.id, 0)
                    const pct = total > 0 ? Math.round((g._count.id / total) * 100) : 0
                    return (
                      <div key={g.gender}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize font-medium">{g.gender || 'Not specified'}</span>
                          <span className="text-gray-500">{g._count.id} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div className={cn('h-3 rounded-full', g.gender === 'female' ? 'bg-pink-500' : 'bg-blue-500')} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                {data.genderBreakdown?.length === 0 && <p className="text-sm text-gray-400">No staff records yet</p>}
              </div>
              <div className="card p-5">
                <h3 className="mb-2">Disability-Inclusive Recruitment</h3>
                <p className="text-sm text-gray-600">Applications from persons with disabilities: <span className="font-bold text-blue-700">{data.disabilityApplicants ?? 0}</span></p>
              </div>
            </div>
          )}

          {tab === 'fraud' && data && (
            <div className="space-y-6">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Fraud detection is system-automated. All flags require manual review before action.</p>
                  <p className="text-xs text-red-600 mt-1">Ghost worker detection rules: employee on payroll but not in HCM, duplicate NIN, no biometric match.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card p-5 text-center">
                  <p className="text-3xl font-bold text-red-700">{(data.ghostWorkers || []).length}</p>
                  <p className="text-xs text-gray-500 mt-1">Ghost Worker Flags</p>
                </div>
                <div className="card p-5 text-center">
                  <p className="text-3xl font-bold text-orange-700">{(data.fraudFlags || []).length}</p>
                  <p className="text-xs text-gray-500 mt-1">Fraud Flags</p>
                </div>
                <div className="card p-5 text-center">
                  <p className="text-3xl font-bold text-purple-700">{data.forgeries ?? 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Credential Forgeries</p>
                </div>
              </div>

              {(data.ghostWorkers || []).length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
                    <h3>Ghost Worker Flags</h3>
                  </div>
                  <table className="w-full">
                    <thead className="bg-gray-50"><tr><th className="table-header">Employee</th><th className="table-header">File No</th><th className="table-header">Reason</th><th className="table-header">Flagged</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.ghostWorkers.map((f: any) => (
                        <tr key={f.id} className="hover:bg-gray-50">
                          <td className="table-cell font-medium">{f.employee?.surname}, {f.employee?.firstName}</td>
                          <td className="table-cell font-mono text-xs">{f.employee?.fileNumber}</td>
                          <td className="table-cell text-xs">{f.reason}</td>
                          <td className="table-cell text-xs">{new Date(f.flaggedAt).toLocaleDateString('en-UG')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'statutory' && data && (
            <div>
              <div className="flex justify-end mb-4">
                <button className="btn-secondary">
                  <Download className="w-4 h-4" />
                  Export All
                </button>
              </div>
              {(data.reports || []).length === 0 ? (
                <div className="card p-10 text-center text-gray-400">No statutory reports generated yet</div>
              ) : (
                <div className="card overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200"><tr><th className="table-header">Type</th><th className="table-header">Period</th><th className="table-header">Generated</th><th className="table-header">Status</th><th className="table-header">Action</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.reports.map((r: any) => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="table-cell font-medium capitalize">{r.reportType?.replace(/_/g, ' ')}</td>
                          <td className="table-cell text-xs">{r.period}</td>
                          <td className="table-cell text-xs">{new Date(r.generatedAt).toLocaleDateString('en-UG')}</td>
                          <td className="table-cell"><span className="badge bg-green-100 text-green-700">{r.status}</span></td>
                          <td className="table-cell"><button className="text-xs text-blue-600 hover:underline">Download</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
