'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { canManageVacancies } from '@/lib/auth'
import { VACANCY_REASONS, SALARY_SCALES } from '@/types'
import { Building2, Plus, FileText, DollarSign, ChevronDown, AlertCircle, CheckCircle2, Clock } from 'lucide-react'

type Tab = 'overview' | 'structure' | 'vacancies' | 'wage-bill'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  wage_bill_cleared: 'bg-blue-100 text-blue-700',
  dsc_approved: 'bg-green-100 text-green-700',
  advertised: 'bg-indigo-100 text-indigo-700',
  filled: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function EstablishmentPage() {
  const { data: session } = useSession()
  const [tab, setTab] = useState<Tab>('overview')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ departmentId: '', staffStructureId: '', postsVacant: 1, reason: 'new_post', justification: '' })

  async function load() {
    setLoading(true)
    const res = await fetch('/api/dsc/establishment')
    const json = await res.json()
    setData(json.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function submitVacancy(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/dsc/vacancies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    setShowForm(false)
    load()
  }

  const canManage = session?.user?.role ? canManageVacancies(session.user.role as any) : false

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'structure', label: 'Staff Structure' },
    { key: 'vacancies', label: 'Vacancy Declarations' },
    { key: 'wage-bill', label: 'Wage-Bill Clearance' },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="page-header">
        <div>
          <h1>Establishment & Vacancies</h1>
          <p className="text-sm text-gray-500 mt-1">Manage approved staff structure and vacancy declarations</p>
        </div>
        {canManage && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Declare Vacancy
          </button>
        )}
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Vacancy declaration form */}
      {showForm && (
        <div className="card p-5 mb-6">
          <h3 className="mb-4">Declare a New Vacancy</h3>
          <form onSubmit={submitVacancy} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Department</label>
              <select className="select" value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })} required>
                <option value="">Select department…</option>
                {(data?.departments || []).map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Post (from Staff Structure)</label>
              <select className="select" value={form.staffStructureId} onChange={e => setForm({ ...form, staffStructureId: e.target.value })} required>
                <option value="">Select post…</option>
                {(data?.departments || [])
                  .find((d: any) => d.id === form.departmentId)
                  ?.staffStructure.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.postTitle} — {s.salaryScale?.grade}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="label">Posts Vacant</label>
              <input className="input" type="number" min={1} value={form.postsVacant} onChange={e => setForm({ ...form, postsVacant: +e.target.value })} required />
            </div>
            <div>
              <label className="label">Reason</label>
              <select className="select" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}>
                {Object.entries(VACANCY_REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Justification</label>
              <textarea className="input" rows={3} value={form.justification} onChange={e => setForm({ ...form, justification: e.target.value })} />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Submit Declaration'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : (
        <>
          {tab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-5 text-center">
                <p className="text-3xl font-bold text-gray-900">{data?.departments?.length ?? 0}</p>
                <p className="text-sm text-gray-500 mt-1">Departments</p>
              </div>
              <div className="card p-5 text-center">
                <p className="text-3xl font-bold text-gray-900">
                  {data?.departments?.reduce((sum: number, d: any) => sum + (d.staffStructure?.length ?? 0), 0) ?? 0}
                </p>
                <p className="text-sm text-gray-500 mt-1">Approved Posts</p>
              </div>
              <div className="card p-5 text-center">
                <p className="text-3xl font-bold text-gray-900">{data?.notices?.length ?? 0}</p>
                <p className="text-sm text-gray-500 mt-1">Establishment Notices</p>
              </div>
            </div>
          )}

          {tab === 'structure' && (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="table-header">Post Title</th>
                    <th className="table-header">Department</th>
                    <th className="table-header">Scale</th>
                    <th className="table-header">Approved</th>
                    <th className="table-header">Filled</th>
                    <th className="table-header">Vacant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(data?.departments || []).flatMap((d: any) =>
                    (d.staffStructure || []).map((s: any) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="table-cell font-medium">{s.postTitle}</td>
                        <td className="table-cell">{d.name}</td>
                        <td className="table-cell"><span className="badge bg-blue-100 text-blue-700">{s.salaryScale?.grade}</span></td>
                        <td className="table-cell text-center">{s.approvedPosts}</td>
                        <td className="table-cell text-center">{s.filledPosts}</td>
                        <td className="table-cell text-center font-semibold text-blue-700">{s.approvedPosts - s.filledPosts}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'vacancies' && (
            <VacancyList />
          )}

          {tab === 'wage-bill' && (
            <div className="card p-8 text-center text-gray-400">
              <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Wage-bill clearances are processed per vacancy. Select a pending vacancy to approve clearance.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function VacancyList() {
  const [vacancies, setVacancies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dsc/vacancies').then(r => r.json()).then(d => { setVacancies(d.data || []); setLoading(false) })
  }, [])

  if (loading) return <div className="text-center py-10 text-gray-400">Loading…</div>
  if (vacancies.length === 0) return <div className="card p-10 text-center text-gray-400">No vacancy declarations yet</div>

  return (
    <div className="card overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="table-header">Post</th>
            <th className="table-header">Department</th>
            <th className="table-header">Reason</th>
            <th className="table-header">Posts</th>
            <th className="table-header">Status</th>
            <th className="table-header">Declared By</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {vacancies.map((v) => (
            <tr key={v.id} className="hover:bg-gray-50">
              <td className="table-cell font-medium">{v.staffStructure?.postTitle}</td>
              <td className="table-cell">{v.department?.name}</td>
              <td className="table-cell">{VACANCY_REASONS[v.reason as keyof typeof VACANCY_REASONS] || v.reason}</td>
              <td className="table-cell text-center">{v.postsVacant}</td>
              <td className="table-cell">
                <span className={cn('badge', STATUS_COLORS[v.status] || 'bg-gray-100 text-gray-600')}>
                  {v.status?.replace(/_/g, ' ')}
                </span>
              </td>
              <td className="table-cell">{v.declaredBy?.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
