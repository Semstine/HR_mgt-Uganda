'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Mail, CheckCircle2, Clock, XCircle, Plus } from 'lucide-react'

export default function AppointmentsPage() {
  const { data: session } = useSession()
  const [decisions, setDecisions] = useState<any[]>([])
  const [cycles, setCycles] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [cycleFilter, setCycleFilter] = useState('')
  const [form, setForm] = useState({ cycleId: '', applicationId: '', decisionType: 'appointed', effectiveDate: '', generateLetter: true, notes: '' })

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (cycleFilter) params.set('cycleId', cycleFilter)
    const [dRes, cRes] = await Promise.all([
      fetch(`/api/dsc/appointments?${params}`),
      fetch('/api/dsc/recruitment'),
    ])
    setDecisions((await dRes.json()).data || [])
    setCycles((await cRes.json()).data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [cycleFilter])

  useEffect(() => {
    if (!form.cycleId) return
    fetch(`/api/dsc/applications?cycleId=${form.cycleId}&status=shortlisted`)
      .then(r => r.json()).then(d => setApplications(d.data || []))
  }, [form.cycleId])

  const role = session?.user?.role || ''
  const canIssue = ['CAO', 'SUPER_ADMIN', 'COMPANY_ADMIN'].includes(role)

  async function submitDecision(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/dsc/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    setShowForm(false)
    load()
  }

  const statusIcon = (s: string) => {
    if (s === 'appointed') return <CheckCircle2 className="w-4 h-4 text-green-600" />
    if (s === 'rejected') return <XCircle className="w-4 h-4 text-red-500" />
    return <Clock className="w-4 h-4 text-amber-500" />
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="page-header">
        <div>
          <h1>Appointment Letters</h1>
          <p className="text-sm text-gray-500 mt-1">DSC appointment decisions and formal letters</p>
        </div>
        <div className="flex gap-3">
          <select className="select w-auto" value={cycleFilter} onChange={e => setCycleFilter(e.target.value)}>
            <option value="">All cycles</option>
            {cycles.map(c => <option key={c.id} value={c.id}>{c.postReference}</option>)}
          </select>
          {canIssue && (
            <button onClick={() => setShowForm(!showForm)} className="btn-primary">
              <Plus className="w-4 h-4" />
              Issue Appointment
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="card p-5 mb-6">
          <h3 className="mb-4">Issue Appointment Decision</h3>
          <form onSubmit={submitDecision} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Recruitment Cycle</label>
              <select className="select" value={form.cycleId} onChange={e => setForm({ ...form, cycleId: e.target.value, applicationId: '' })} required>
                <option value="">Select cycle…</option>
                {cycles.map(c => <option key={c.id} value={c.id}>{c.postReference}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Candidate</label>
              <select className="select" value={form.applicationId} onChange={e => setForm({ ...form, applicationId: e.target.value })} required>
                <option value="">Select candidate…</option>
                {applications.map(a => <option key={a.id} value={a.id}>{a.surname}, {a.firstName} ({a.applicationRef})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Decision</label>
              <select className="select" value={form.decisionType} onChange={e => setForm({ ...form, decisionType: e.target.value })}>
                <option value="appointed">Appointed</option>
                <option value="rejected">Rejected</option>
                <option value="deferred">Deferred</option>
                <option value="reserve">Reserve List</option>
              </select>
            </div>
            <div>
              <label className="label">Effective Date</label>
              <input className="input" type="date" value={form.effectiveDate} onChange={e => setForm({ ...form, effectiveDate: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.generateLetter} onChange={e => setForm({ ...form, generateLetter: e.target.checked })} className="rounded" />
                <span className="text-sm text-gray-700">Generate appointment letter & notify by SMS</span>
              </label>
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Issuing…' : 'Issue Decision'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : decisions.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <Mail className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No appointment decisions yet</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-header">Candidate</th>
                <th className="table-header">Post / Cycle</th>
                <th className="table-header">Decision</th>
                <th className="table-header">Letter Ref</th>
                <th className="table-header">Effective Date</th>
                <th className="table-header">Acceptance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {decisions.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <p className="font-medium">{d.application?.surname}, {d.application?.firstName}</p>
                    <p className="text-xs text-gray-400">{d.application?.applicationRef}</p>
                  </td>
                  <td className="table-cell text-xs">{d.cycle?.postReference}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1.5">
                      {statusIcon(d.decisionType)}
                      <span className={cn('capitalize text-sm', d.decisionType === 'appointed' ? 'text-green-700' : d.decisionType === 'rejected' ? 'text-red-600' : 'text-gray-600')}>
                        {d.decisionType}
                      </span>
                    </div>
                  </td>
                  <td className="table-cell font-mono text-xs">{d.letter?.letterRef ?? '—'}</td>
                  <td className="table-cell text-xs">{d.effectiveDate ? new Date(d.effectiveDate).toLocaleDateString('en-UG') : '—'}</td>
                  <td className="table-cell">
                    {d.letter?.acceptedAt ? (
                      <span className="badge bg-green-100 text-green-700">Accepted</span>
                    ) : d.letter?.acceptanceDeadline && new Date(d.letter.acceptanceDeadline) < new Date() ? (
                      <span className="badge bg-red-100 text-red-700">Expired</span>
                    ) : d.letter ? (
                      <span className="badge bg-amber-100 text-amber-700">Awaiting</span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
