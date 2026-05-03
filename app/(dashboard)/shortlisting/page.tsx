'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Lock, Star, Plus, ClipboardCheck } from 'lucide-react'

type Tab = 'panels' | 'score' | 'decisions'

export default function ShortlistingPage() {
  const { data: session } = useSession()
  const [tab, setTab] = useState<Tab>('panels')
  const [panels, setPanels] = useState<any[]>([])
  const [cycles, setCycles] = useState<any[]>([])
  const [selectedPanel, setSelectedPanel] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [createForm, setCreateForm] = useState({ cycleId: '', memberIds: ['', '', ''] })
  const [showCreate, setShowCreate] = useState(false)
  const [scoreForm, setScoreForm] = useState({ applicationId: '', scores: { academic: 0, experience: 0, training: 0, other: 0 }, overallResult: 'shortlisted', notes: '' })

  const role = session?.user?.role || ''
  const canScore = ['DSC_CHAIRPERSON', 'DSC_MEMBER', 'SECRETARY_DSC', 'COOPTED_TECHNICAL_SPECIALIST', 'NATIONAL_ADMIN_MOPS', 'SUPER_ADMIN'].includes(role)
  const canLock = ['SECRETARY_DSC', 'NATIONAL_ADMIN_MOPS', 'SUPER_ADMIN'].includes(role)
  const canCreate = ['SECRETARY_DSC', 'NATIONAL_ADMIN_MOPS', 'SUPER_ADMIN'].includes(role)

  async function load() {
    setLoading(true)
    const [pRes, cRes] = await Promise.all([
      fetch('/api/dsc/shortlisting'),
      fetch('/api/dsc/recruitment'),
    ])
    const panelData = (await pRes.json()).data || []
    setPanels(panelData)
    setCycles((await cRes.json()).data || [])
    if (panelData.length > 0 && !selectedPanel) setSelectedPanel(panelData[0])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!selectedPanel) return
    fetch(`/api/dsc/applications?cycleId=${selectedPanel.recruitmentCycleId}`)
      .then(r => r.json())
      .then(d => setApplications(d.data || []))
  }, [selectedPanel])

  async function createPanel(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/dsc/shortlisting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cycleId: createForm.cycleId, memberIds: createForm.memberIds.filter(Boolean) }),
    })
    setSaving(false)
    if (res.ok) { setShowCreate(false); load() }
    else alert((await res.json()).error)
  }

  async function submitScore(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPanel) return
    setSaving(true)
    const res = await fetch(`/api/dsc/shortlisting/${selectedPanel.id}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...scoreForm, submit: true }),
    })
    setSaving(false)
    if (res.ok) {
      setScoreForm({ applicationId: '', scores: { academic: 0, experience: 0, training: 0, other: 0 }, overallResult: 'shortlisted', notes: '' })
      load()
    } else alert((await res.json()).error)
  }

  async function lockPanel(panelId: string) {
    if (!confirm('Lock this panel? No more scores can be submitted after locking.')) return
    const res = await fetch(`/api/dsc/shortlisting/${panelId}/lock`, { method: 'POST' })
    if (res.ok) load()
    else alert((await res.json()).error)
  }

  const totalScore = Object.values(scoreForm.scores).reduce((a, b) => a + b, 0)

  const STATUS_COLORS: Record<string, string> = {
    open: 'bg-gray-100 text-gray-600',
    scoring: 'bg-blue-100 text-blue-700',
    locked: 'bg-orange-100 text-orange-700',
    approved: 'bg-green-100 text-green-700',
    published: 'bg-emerald-100 text-emerald-700',
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="page-header">
        <div>
          <h1>Shortlisting</h1>
          <p className="text-sm text-gray-500 mt-1">Independent DSC member scoring, panel lock, and shortlist decisions</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">
            <Plus className="w-4 h-4" /> Constitute Panel
          </button>
        )}
      </div>

      {showCreate && (
        <form onSubmit={createPanel} className="card p-5 mb-6 space-y-4 max-w-xl">
          <h3 className="font-semibold">Constitute Shortlisting Panel</h3>
          <div>
            <label className="label">Recruitment Cycle</label>
            <select className="select" value={createForm.cycleId} onChange={e => setCreateForm({ ...createForm, cycleId: e.target.value })} required>
              <option value="">Select cycle…</option>
              {cycles.map(c => <option key={c.id} value={c.id}>{c.postRef} — {c.postTitle}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="label">Panel Member User IDs (at least 2)</label>
            {createForm.memberIds.map((m, i) => (
              <input key={i} className="input" placeholder={`Member ${i + 1} user ID`} value={m} onChange={e => { const ids = [...createForm.memberIds]; ids[i] = e.target.value; setCreateForm({ ...createForm, memberIds: ids }) }} />
            ))}
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Create Panel'}</button>
            <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {([['panels', 'Panels'], ['score', 'Score Applications'], ['decisions', 'Shortlist Decisions']] as [Tab, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cn('px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors', tab === k ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700')}>
            {l}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-16 text-gray-400">Loading…</div> : (
        <>
          {tab === 'panels' && (
            <div className="space-y-4">
              {panels.length === 0 && (
                <div className="card p-12 text-center">
                  <ClipboardCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400">No shortlisting panels yet. Constitute a panel to begin scoring.</p>
                </div>
              )}
              {panels.map(p => (
                <div key={p.id} className={cn('card p-5 cursor-pointer hover:shadow-md transition-all', selectedPanel?.id === p.id ? 'ring-2 ring-blue-600' : '')} onClick={() => setSelectedPanel(p)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{p.recruitmentCycle?.postTitle || 'Cycle'}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{p.recruitmentCycle?.postRef} · {p.panelMembers?.length ?? 0} member(s)</p>
                      {p.lockedAt && <p className="text-xs text-orange-600 mt-1">Locked {new Date(p.lockedAt).toLocaleDateString('en-UG')}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('badge', STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600')}>{p.status}</span>
                      {canLock && !p.lockedAt && (
                        <button className="btn-sm bg-orange-50 text-orange-700 hover:bg-orange-100" onClick={e => { e.stopPropagation(); lockPanel(p.id) }}>
                          <Lock className="w-3.5 h-3.5" /> Lock Panel
                        </button>
                      )}
                    </div>
                  </div>
                  {p.panelMembers && p.panelMembers.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {p.panelMembers.map((m: any) => (
                        <span key={m.id} className="badge bg-gray-100 text-gray-600">{m.memberRole?.replace(/_/g, ' ')} · {m.memberId.slice(-6)}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'score' && (
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-1 space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Select Panel</p>
                {panels.map(p => (
                  <div key={p.id} className={cn('card p-3 cursor-pointer hover:shadow-sm transition-all', selectedPanel?.id === p.id ? 'ring-2 ring-blue-600 bg-blue-50' : '')} onClick={() => setSelectedPanel(p)}>
                    <p className="text-sm font-semibold">{p.recruitmentCycle?.postRef}</p>
                    <p className="text-xs text-gray-500">{p.status} · {p.panelMembers?.length ?? 0} members</p>
                  </div>
                ))}
              </div>

              <div className="col-span-2">
                {!selectedPanel ? (
                  <div className="card p-10 text-center text-gray-400">Select a panel to score applications</div>
                ) : selectedPanel.lockedAt ? (
                  <div className="card p-10 text-center">
                    <Lock className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                    <p className="text-gray-500">This panel is locked. No further scores can be submitted.</p>
                  </div>
                ) : !canScore ? (
                  <div className="card p-10 text-center text-gray-400">You do not have permission to score applications.</div>
                ) : (
                  <form onSubmit={submitScore} className="card p-6 space-y-5">
                    <h3 className="font-semibold">Score Application — {selectedPanel.recruitmentCycle?.postTitle}</h3>
                    <div>
                      <label className="label">Applicant</label>
                      <select className="select" value={scoreForm.applicationId} onChange={e => setScoreForm({ ...scoreForm, applicationId: e.target.value })} required>
                        <option value="">Select applicant…</option>
                        {applications.map(a => <option key={a.id} value={a.id}>{a.firstName} {a.lastName} — {a.applicationRef}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {[['academic', 'Academic Qualifications'], ['experience', 'Work Experience'], ['training', 'Relevant Training'], ['other', 'Other Criteria']].map(([k, l]) => (
                        <div key={k}>
                          <label className="label">{l}</label>
                          <div className="flex items-center gap-3">
                            <input type="range" min={0} max={25} value={(scoreForm.scores as any)[k]} onChange={e => setScoreForm({ ...scoreForm, scores: { ...scoreForm.scores, [k]: +e.target.value } })} className="flex-1" />
                            <span className="w-8 text-sm font-bold text-center">{(scoreForm.scores as any)[k]}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-blue-700">{totalScore}</p>
                      <p className="text-xs text-blue-600 mt-1">Total Score / 100</p>
                    </div>
                    <div>
                      <label className="label">Overall Result</label>
                      <select className="select" value={scoreForm.overallResult} onChange={e => setScoreForm({ ...scoreForm, overallResult: e.target.value })}>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="reserve">Reserve</option>
                        <option value="not_shortlisted">Not Shortlisted</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Notes (optional)</label>
                      <textarea className="input" rows={2} value={scoreForm.notes} onChange={e => setScoreForm({ ...scoreForm, notes: e.target.value })} placeholder="Any remarks…" />
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" className="btn-primary" disabled={saving || !scoreForm.applicationId}>
                        <Star className="w-4 h-4" /> {saving ? 'Submitting…' : 'Submit Score'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {tab === 'decisions' && (
            <div className="space-y-4">
              {panels.length === 0 && <div className="card p-10 text-center text-gray-400">No panels available</div>}
              {panels.map(p => (
                <div key={p.id} className="card overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{p.recruitmentCycle?.postRef} — {p.recruitmentCycle?.postTitle}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{p.decisions?.length ?? 0} decisions recorded</p>
                    </div>
                    <span className={cn('badge', STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600')}>{p.status}</span>
                  </div>
                  {p.decisions && p.decisions.length > 0 ? (
                    <div className="divide-y divide-gray-50">
                      {p.decisions.map((d: any) => (
                        <div key={d.id} className="px-5 py-3 flex items-center justify-between">
                          <p className="text-sm">{d.application?.firstName} {d.application?.lastName}</p>
                          <span className={cn('badge', d.finalDecision === 'shortlisted' ? 'bg-green-100 text-green-700' : d.finalDecision === 'reserve' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')}>
                            {d.finalDecision}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="p-5 text-sm text-gray-400">No decisions yet — lock the panel to auto-generate shortlist decisions from scores.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
