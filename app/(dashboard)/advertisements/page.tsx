'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Plus, Send, CheckCircle2, Radio } from 'lucide-react'

type Tab = 'list' | 'create'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending_approval: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
  closed: 'bg-red-100 text-red-700',
}

const CHANNELS = ['newspaper', 'radio', 'district_noticeboard', 'hcm_portal', 'psc_website', 'sms_blast']

export default function AdvertisementsPage() {
  const { data: session } = useSession()
  const [tab, setTab] = useState<Tab>('list')
  const [adverts, setAdverts] = useState<any[]>([])
  const [cycles, setCycles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState({
    cycleId: '', advertText: '', deadline: '', channels: [] as string[],
    minimumQualifications: '', experienceRequired: '', salaryRange: '',
  })

  const role = session?.user?.role || ''
  const canApprove = ['SECRETARY_DSC', 'NATIONAL_ADMIN_MOPS', 'SUPER_ADMIN'].includes(role)
  const canPublish = ['SECRETARY_DSC', 'NATIONAL_ADMIN_MOPS', 'SUPER_ADMIN'].includes(role)

  async function load() {
    setLoading(true)
    const [aRes, cRes] = await Promise.all([
      fetch('/api/dsc/adverts'),
      fetch('/api/dsc/recruitment'),
    ])
    setAdverts((await aRes.json()).data || [])
    setCycles((await cRes.json()).data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function submitAdvert(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/dsc/adverts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) { setTab('list'); load() }
    else alert((await res.json()).error)
  }

  async function approve(id: string) {
    await fetch(`/api/dsc/adverts/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minuteItemRef: `MIN/${new Date().getFullYear()}/${id.slice(-4)}` }),
    })
    load()
  }

  async function publish(id: string) {
    await fetch(`/api/dsc/adverts/${id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channels: form.channels.length ? form.channels : ['newspaper', 'district_noticeboard', 'hcm_portal'] }),
    })
    load()
  }

  function toggleChannel(ch: string) {
    setForm(f => ({
      ...f,
      channels: f.channels.includes(ch) ? f.channels.filter(c => c !== ch) : [...f.channels, ch],
    }))
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="page-header">
        <div>
          <h1>Advertisements</h1>
          <p className="text-sm text-gray-500 mt-1">Create, approve, and publish vacancy adverts across all channels</p>
        </div>
        <button onClick={() => setTab('create')} className="btn-primary">
          <Plus className="w-4 h-4" /> New Advert
        </button>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {([['list', 'All Adverts'], ['create', 'Create Advert']] as [Tab, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cn('px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors', tab === k ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700')}>
            {l}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-16 text-gray-400">Loading…</div> : (
        <>
          {tab === 'list' && (
            <div className="space-y-4">
              {adverts.length === 0 && (
                <div className="card p-12 text-center">
                  <Radio className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400">No adverts yet. Create the first advert for a recruitment cycle.</p>
                </div>
              )}
              {adverts.map(ad => (
                <div key={ad.id} className={cn('card p-5 cursor-pointer hover:shadow-md transition-all', selected?.id === ad.id ? 'ring-2 ring-blue-600' : '')} onClick={() => setSelected(selected?.id === ad.id ? null : ad)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{ad.postTitle}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{ad.postRef} · {ad.grade} · {ad.department}</p>
                      {ad.deadline && <p className="text-xs text-gray-400 mt-1">Deadline: {new Date(ad.deadline).toLocaleDateString('en-UG')}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={cn('badge', STATUS_COLORS[ad.status] || 'bg-gray-100 text-gray-600')}>{ad.status?.replace(/_/g, ' ')}</span>
                      <div className="flex gap-2">
                        {canApprove && ad.status === 'draft' && (
                          <button className="btn-sm bg-blue-50 text-blue-700 hover:bg-blue-100" onClick={e => { e.stopPropagation(); approve(ad.id) }}>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>
                        )}
                        {canPublish && ad.status === 'approved' && (
                          <button className="btn-sm bg-green-50 text-green-700 hover:bg-green-100" onClick={e => { e.stopPropagation(); publish(ad.id) }}>
                            <Send className="w-3.5 h-3.5" /> Publish
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {selected?.id === ad.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-700 space-y-2">
                      {ad.advertText && <p><span className="font-medium">Advert text:</span> {ad.advertText}</p>}
                      {ad.minimumQualifications && <p><span className="font-medium">Min qualifications:</span> {ad.minimumQualifications}</p>}
                      {ad.experienceRequired && <p><span className="font-medium">Experience:</span> {ad.experienceRequired}</p>}
                      {ad.salaryRange && <p><span className="font-medium">Salary range:</span> {ad.salaryRange}</p>}
                      <p><span className="font-medium">Channels:</span> {(ad.channels || []).join(', ') || '—'}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'create' && (
            <form onSubmit={submitAdvert} className="card p-6 space-y-5 max-w-2xl">
              <h2 className="font-semibold text-gray-900">Create New Advert</h2>
              <div>
                <label className="label">Recruitment Cycle</label>
                <select className="select" value={form.cycleId} onChange={e => setForm({ ...form, cycleId: e.target.value })} required>
                  <option value="">Select a cycle…</option>
                  {cycles.map(c => <option key={c.id} value={c.id}>{c.postRef} — {c.postTitle}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Advert Text</label>
                <textarea className="input" rows={4} value={form.advertText} onChange={e => setForm({ ...form, advertText: e.target.value })} placeholder="Full advertisement body as it will appear in the newspaper…" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Minimum Qualifications</label>
                  <input className="input" value={form.minimumQualifications} onChange={e => setForm({ ...form, minimumQualifications: e.target.value })} placeholder="e.g. Bachelor's Degree in …" />
                </div>
                <div>
                  <label className="label">Experience Required</label>
                  <input className="input" value={form.experienceRequired} onChange={e => setForm({ ...form, experienceRequired: e.target.value })} placeholder="e.g. 3 years in related field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Salary Range</label>
                  <input className="input" value={form.salaryRange} onChange={e => setForm({ ...form, salaryRange: e.target.value })} placeholder="e.g. UGX 1,200,000 – 1,500,000" />
                </div>
                <div>
                  <label className="label">Application Deadline</label>
                  <input className="input" type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="label mb-2">Publication Channels</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {CHANNELS.map(ch => (
                    <button type="button" key={ch} onClick={() => toggleChannel(ch)} className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors', form.channels.includes(ch) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400')}>
                      {ch.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Create Advert'}</button>
                <button type="button" className="btn-secondary" onClick={() => setTab('list')}>Cancel</button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  )
}
