'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { BadgeCheck, AlertTriangle, ShieldCheck } from 'lucide-react'

type Tab = 'list' | 'run'

const VERIFICATION_TYPES = [
  { value: 'nira_nin', label: 'NIRA — National ID (NIN)' },
  { value: 'uneb_uce', label: 'UNEB — UCE (O-Level)' },
  { value: 'uneb_uace', label: 'UNEB — UACE (A-Level)' },
  { value: 'nche_degree', label: 'NCHE — University Degree' },
  { value: 'ura_tin', label: 'URA — Tax ID (TIN)' },
]

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  verified: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  waived: 'bg-gray-100 text-gray-600',
  not_found: 'bg-orange-100 text-orange-700',
}

export default function VerificationPage() {
  const { data: session } = useSession()
  const [tab, setTab] = useState<Tab>('list')
  const [verifications, setVerifications] = useState<any[]>([])
  const [cycles, setCycles] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [cycleFilter, setCycleFilter] = useState('')
  const [form, setForm] = useState({
    applicationId: '', cycleId: '',
    verificationType: 'nira_nin',
    referenceNumber: '',
    institution: '',
    yearObtained: '',
    notes: '',
    waived: false,
  })

  const role = session?.user?.role || ''
  const canVerify = ['SECRETARY_DSC', 'DHRO', 'NATIONAL_ADMIN_MOPS', 'SUPER_ADMIN'].includes(role)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (cycleFilter) params.set('cycleId', cycleFilter)
    const [vRes, cRes] = await Promise.all([
      fetch(`/api/dsc/verification?${params}`),
      fetch('/api/dsc/recruitment'),
    ])
    setVerifications((await vRes.json()).data || [])
    setCycles((await cRes.json()).data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [cycleFilter])

  useEffect(() => {
    if (!form.cycleId) { setApplications([]); return }
    fetch(`/api/dsc/applications?cycleId=${form.cycleId}&status=shortlisted`)
      .then(r => r.json())
      .then(d => setApplications(d.data || []))
  }, [form.cycleId])

  async function runVerification(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/dsc/verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) { setTab('list'); load() }
    else alert((await res.json()).error)
  }

  const summary = {
    total: verifications.length,
    verified: verifications.filter(v => v.status === 'verified').length,
    failed: verifications.filter(v => v.status === 'failed').length,
    pending: verifications.filter(v => v.status === 'pending').length,
    waived: verifications.filter(v => v.status === 'waived').length,
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="page-header">
        <div>
          <h1>Credential Verification</h1>
          <p className="text-sm text-gray-500 mt-1">NIRA, UNEB, NCHE, URA and professional body checks for shortlisted candidates</p>
        </div>
        {canVerify && (
          <button onClick={() => setTab('run')} className="btn-primary">
            <ShieldCheck className="w-4 h-4" /> Run Verification
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {([['list', 'Verification Log'], ['run', 'Run Check']] as [Tab, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cn('px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors', tab === k ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700')}>
            {l}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-16 text-gray-400">Loading…</div> : (
        <>
          {tab === 'list' && (
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-3">
                {([['Total', summary.total, 'text-gray-700'], ['Verified', summary.verified, 'text-green-700'], ['Failed', summary.failed, 'text-red-700'], ['Pending', summary.pending, 'text-yellow-700'], ['Waived', summary.waived, 'text-gray-500']] as [string, number, string][]).map(([l, v, c]) => (
                  <div key={l} className="card p-4 text-center">
                    <p className={cn('text-2xl font-bold', c)}>{v}</p>
                    <p className="text-xs text-gray-500 mt-1">{l}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <select className="select w-auto" value={cycleFilter} onChange={e => setCycleFilter(e.target.value)}>
                  <option value="">All cycles</option>
                  {cycles.map(c => <option key={c.id} value={c.id}>{c.postRef}</option>)}
                </select>
              </div>

              {verifications.length === 0 && (
                <div className="card p-12 text-center">
                  <BadgeCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400">No verifications yet. Use "Run Check" to verify credentials for shortlisted candidates.</p>
                </div>
              )}

              <div className="card divide-y divide-gray-50">
                {verifications.map(v => (
                  <div key={v.id} className={cn('px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors', selected?.id === v.id ? 'bg-blue-50' : '')} onClick={() => setSelected(selected?.id === v.id ? null : v)}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">
                          {v.application?.firstName} {v.application?.lastName}
                          <span className="text-sm font-normal text-gray-400 ml-2">— {v.application?.applicationRef}</span>
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {VERIFICATION_TYPES.find(t => t.value === v.verificationType)?.label || v.verificationType}
                          {v.referenceNumber && <span className="ml-2 text-gray-400">· {v.referenceNumber}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={cn('badge', STATUS_COLORS[v.status] || 'bg-gray-100 text-gray-600')}>{v.status}</span>
                        {v.result && <span className="badge bg-gray-100 text-gray-500">{v.result}</span>}
                      </div>
                    </div>
                    {selected?.id === v.id && (
                      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-gray-400">Verified by:</span> {v.verifiedBy || '—'}</div>
                        <div><span className="text-gray-400">Verified at:</span> {v.verifiedAt ? new Date(v.verifiedAt).toLocaleDateString('en-UG') : '—'}</div>
                        {v.waivedReason && <div className="col-span-2"><span className="text-gray-400">Waiver reason:</span> {v.waivedReason}</div>}
                        {v.notes && <div className="col-span-2"><span className="text-gray-400">Notes:</span> {v.notes}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'run' && (
            <form onSubmit={runVerification} className="card p-6 space-y-5 max-w-xl">
              <h2 className="font-semibold text-gray-900">Run Credential Check</h2>
              <div>
                <label className="label">Recruitment Cycle</label>
                <select className="select" value={form.cycleId} onChange={e => setForm({ ...form, cycleId: e.target.value, applicationId: '' })} required>
                  <option value="">Select cycle…</option>
                  {cycles.map(c => <option key={c.id} value={c.id}>{c.postRef} — {c.postTitle}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Applicant</label>
                <select className="select" value={form.applicationId} onChange={e => setForm({ ...form, applicationId: e.target.value })} required>
                  <option value="">Select applicant…</option>
                  {applications.map(a => <option key={a.id} value={a.id}>{a.firstName} {a.lastName} — {a.applicationRef}</option>)}
                </select>
                {form.cycleId && applications.length === 0 && <p className="text-xs text-orange-600 mt-1">No shortlisted applicants in this cycle yet.</p>}
              </div>
              <div>
                <label className="label">Verification Type</label>
                <select className="select" value={form.verificationType} onChange={e => setForm({ ...form, verificationType: e.target.value })}>
                  {VERIFICATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Reference Number</label>
                <input className="input" value={form.referenceNumber} onChange={e => setForm({ ...form, referenceNumber: e.target.value })}
                  placeholder={form.verificationType === 'nira_nin' ? 'CM…' : form.verificationType.startsWith('uneb') ? 'Index No.' : form.verificationType === 'ura_tin' ? 'TIN…' : 'Certificate / Reg No.'}
                  required={!form.waived} />
              </div>
              {form.verificationType === 'nche_degree' && (
                <div>
                  <label className="label">Institution</label>
                  <input className="input" value={form.institution} onChange={e => setForm({ ...form, institution: e.target.value })} placeholder="Makerere University" />
                </div>
              )}
              {form.verificationType.startsWith('uneb') && (
                <div>
                  <label className="label">Year Obtained</label>
                  <input className="input" type="number" value={form.yearObtained} onChange={e => setForm({ ...form, yearObtained: e.target.value })} placeholder="2005" />
                </div>
              )}
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any remarks…" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="waive" checked={form.waived} onChange={e => setForm({ ...form, waived: e.target.checked })} className="w-4 h-4" />
                <label htmlFor="waive" className="text-sm text-gray-700">Waive this verification (document justification in notes)</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary" disabled={saving}>
                  <BadgeCheck className="w-4 h-4" /> {saving ? 'Running…' : (form.waived ? 'Record Waiver' : 'Run Verification')}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setTab('list')}>Cancel</button>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                Results from NIRA, UNEB, NCHE and URA are via integration stubs. All checks are logged to the immutable audit trail.
              </div>
            </form>
          )}
        </>
      )}
    </div>
  )
}
