'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { FileText, Plus, Search } from 'lucide-react'

type Tab = 'list' | 'register'

const STATUS_COLORS: Record<string, string> = {
  received: 'bg-gray-100 text-gray-600',
  under_review: 'bg-blue-100 text-blue-700',
  shortlisted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  invited: 'bg-indigo-100 text-indigo-700',
  selected: 'bg-emerald-100 text-emerald-700',
  appointed: 'bg-purple-100 text-purple-700',
  reserve: 'bg-yellow-100 text-yellow-700',
  withdrawn: 'bg-gray-100 text-gray-500',
}

const CHANNEL_COLORS: Record<string, string> = {
  online: 'bg-blue-50 text-blue-700',
  ussd: 'bg-purple-50 text-purple-700',
  paper: 'bg-orange-50 text-orange-700',
}

export default function ApplicationsPage() {
  const { data: session } = useSession()
  const [tab, setTab] = useState<Tab>('list')
  const [applications, setApplications] = useState<any[]>([])
  const [cycles, setCycles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [cycleFilter, setCycleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState({
    cycleId: '', firstName: '', lastName: '', otherNames: '',
    nin: '', gender: 'male', dateOfBirth: '', phone: '', email: '',
    pwdStatus: false, intakeChannel: 'paper',
  })

  const role = session?.user?.role || ''
  const canRegister = ['DISTRICT_RECEPTION_CLERK', 'DHRO', 'SECRETARY_DSC', 'NATIONAL_ADMIN_MOPS', 'SUPER_ADMIN'].includes(role)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (cycleFilter) params.set('cycleId', cycleFilter)
    if (statusFilter) params.set('status', statusFilter)
    const [aRes, cRes] = await Promise.all([
      fetch(`/api/dsc/applications?${params}`),
      fetch('/api/dsc/recruitment'),
    ])
    setApplications((await aRes.json()).data || [])
    setCycles((await cRes.json()).data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [cycleFilter, statusFilter])

  async function submitApplication(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/dsc/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) { setTab('list'); load() }
    else alert((await res.json()).error)
  }

  const filtered = applications.filter(a => {
    if (!search) return true
    const q = search.toLowerCase()
    return `${a.firstName} ${a.lastName} ${a.applicationRef} ${a.postRef}`.toLowerCase().includes(q)
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="page-header">
        <div>
          <h1>Applications / PSC Form 3</h1>
          <p className="text-sm text-gray-500 mt-1">Unified register for online, USSD, and scanned paper applications</p>
        </div>
        {canRegister && (
          <button onClick={() => setTab('register')} className="btn-primary">
            <Plus className="w-4 h-4" /> Register Paper Form
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {([['list', 'Application Register'], ['register', 'Register Paper Form']] as [Tab, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cn('px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors', tab === k ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700')}>
            {l}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-16 text-gray-400">Loading…</div> : (
        <>
          {tab === 'list' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input className="input pl-9" placeholder="Search by name, ref, post…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="select w-auto" value={cycleFilter} onChange={e => setCycleFilter(e.target.value)}>
                  <option value="">All cycles</option>
                  {cycles.map(c => <option key={c.id} value={c.id}>{c.postRef}</option>)}
                </select>
                <select className="select w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">All statuses</option>
                  {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {([['Total', filtered.length, 'text-gray-700'], ['Online', filtered.filter(a => a.intakeChannel === 'online').length, 'text-blue-700'], ['USSD', filtered.filter(a => a.intakeChannel === 'ussd').length, 'text-purple-700'], ['Paper', filtered.filter(a => a.intakeChannel === 'paper').length, 'text-orange-700']] as [string, number, string][]).map(([label, count, color]) => (
                  <div key={label} className="card p-4 text-center">
                    <p className={cn('text-2xl font-bold', color)}>{count}</p>
                    <p className="text-xs text-gray-500 mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {filtered.length === 0 && (
                <div className="card p-12 text-center">
                  <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400">No applications found.</p>
                </div>
              )}

              <div className="card divide-y divide-gray-50">
                {filtered.map(a => (
                  <div key={a.id} className={cn('px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors', selected?.id === a.id ? 'bg-blue-50' : '')} onClick={() => setSelected(selected?.id === a.id ? null : a)}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">{a.firstName} {a.lastName}</p>
                        <p className="text-sm text-gray-500">{a.applicationRef} · {a.postRef}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={cn('badge', CHANNEL_COLORS[a.intakeChannel] || '')}>{a.intakeChannel}</span>
                        <span className={cn('badge', STATUS_COLORS[a.status] || 'bg-gray-100 text-gray-600')}>{a.status?.replace(/_/g, ' ')}</span>
                        {a.pwdStatus && <span className="badge bg-teal-50 text-teal-700">PWD</span>}
                        {a.duplicateFlag && <span className="badge bg-red-50 text-red-700">Duplicate</span>}
                      </div>
                    </div>
                    {selected?.id === a.id && (
                      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-gray-400">Phone:</span> {a.phone || '—'}</div>
                        <div><span className="text-gray-400">Email:</span> {a.email || '—'}</div>
                        <div><span className="text-gray-400">Gender:</span> {a.gender || '—'}</div>
                        <div><span className="text-gray-400">NIN:</span> {a.nin || '—'}</div>
                        <div><span className="text-gray-400">NIN verified:</span> {a.ninVerified ? '✓ Yes' : '✗ No'}</div>
                        <div><span className="text-gray-400">Docs complete:</span> {a.documentComplete ? '✓ Yes' : '✗ No'}</div>
                        <div><span className="text-gray-400">Submitted:</span> {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString('en-UG') : '—'}</div>
                        <div><span className="text-gray-400">Cycle:</span> {a.recruitmentCycle?.postRef || '—'}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'register' && (
            <form onSubmit={submitApplication} className="card p-6 space-y-5 max-w-2xl">
              <h2 className="font-semibold text-gray-900">Register Paper PSC Form 3</h2>
              <div>
                <label className="label">Recruitment Cycle</label>
                <select className="select" value={form.cycleId} onChange={e => setForm({ ...form, cycleId: e.target.value })} required>
                  <option value="">Select cycle…</option>
                  {cycles.map(c => <option key={c.id} value={c.id}>{c.postRef} — {c.postTitle}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">First Name</label>
                  <input className="input" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input className="input" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Other Names</label>
                  <input className="input" value={form.otherNames} onChange={e => setForm({ ...form, otherNames: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">NIN</label>
                  <input className="input" value={form.nin} onChange={e => setForm({ ...form, nin: e.target.value })} placeholder="CM…" />
                </div>
                <div>
                  <label className="label">Date of Birth</label>
                  <input className="input" type="date" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Phone</label>
                  <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+256…" />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Gender</label>
                  <select className="select" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 mt-6">
                  <input type="checkbox" id="pwd" checked={form.pwdStatus} onChange={e => setForm({ ...form, pwdStatus: e.target.checked })} className="w-4 h-4" />
                  <label htmlFor="pwd" className="text-sm text-gray-700">Person with Disability (PWD)</label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Registering…' : 'Register Application'}</button>
                <button type="button" className="btn-secondary" onClick={() => setTab('list')}>Cancel</button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  )
}
