'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Users, Calendar, Star } from 'lucide-react'

type Tab = 'panels' | 'schedule' | 'scores'

export default function InterviewsPage() {
  const { data: session } = useSession()
  const [tab, setTab] = useState<Tab>('panels')
  const [panels, setPanels] = useState<any[]>([])
  const [selectedPanel, setSelectedPanel] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [scoreForm, setScoreForm] = useState({ applicationId: '', technicalScore: 0, communicationScore: 0, leadershipScore: 0, professionalismScore: 0, recommendation: 'appoint', remarks: '' })

  async function load() {
    setLoading(true)
    const res = await fetch('/api/dsc/interviews')
    const data = (await res.json()).data || []
    setPanels(data)
    if (data.length > 0 && !selectedPanel) setSelectedPanel(data[0])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const role = session?.user?.role || ''
  const canScore = ['DSC_CHAIRPERSON', 'DSC_MEMBER', 'SECRETARY_DSC', 'COOPTED_TECHNICAL_SPECIALIST'].includes(role)

  const totalScore = scoreForm.technicalScore + scoreForm.communicationScore + scoreForm.leadershipScore + scoreForm.professionalismScore

  async function submitScore(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPanel) return
    setSaving(true)
    await fetch(`/api/dsc/interviews/${selectedPanel.id}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...scoreForm, totalScore }),
    })
    setSaving(false)
    setScoreForm({ applicationId: '', technicalScore: 0, communicationScore: 0, leadershipScore: 0, professionalismScore: 0, recommendation: 'appoint', remarks: '' })
    load()
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="page-header">
        <div>
          <h1>Interviews & Tests</h1>
          <p className="text-sm text-gray-500 mt-1">Manage interview panels, schedules, and scores</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {([['panels', 'Panel Composition'], ['schedule', 'Schedule'], ['scores', 'Scores & Decision']] as [Tab, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cn('px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors', tab === k ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700')}>
            {l}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-16 text-gray-400">Loading…</div> : (
        <>
          {tab === 'panels' && (
            <div className="space-y-4">
              {panels.length === 0 && <div className="card p-10 text-center text-gray-400">No interview panels constituted yet</div>}
              {panels.map(p => (
                <div key={p.id} className={cn('card p-5 cursor-pointer transition-all', selectedPanel?.id === p.id ? 'ring-2 ring-blue-600' : 'hover:shadow-md')} onClick={() => setSelectedPanel(p)}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold">{p.cycle?.postReference}</p>
                      <p className="text-sm text-gray-500">{p.cycle?.vacancy?.department?.name} &bull; {p.panelType}</p>
                    </div>
                    <span className="badge bg-indigo-100 text-indigo-700">{p.members?.length ?? 0} members</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(p.members || []).map((m: any) => (
                      <span key={m.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        {m.user?.name} <span className="text-gray-400">({m.role})</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'schedule' && (
            <div>
              {!selectedPanel ? (
                <div className="card p-10 text-center text-gray-400">Select a panel from the Panels tab</div>
              ) : (
                <div className="space-y-4">
                  <div className="card p-5">
                    <h3 className="mb-3">Panel: {selectedPanel.cycle?.postReference}</h3>
                    <div className="space-y-3">
                      {(selectedPanel.schedules || []).length === 0 ? (
                        <p className="text-sm text-gray-400">No interviews scheduled yet</p>
                      ) : (
                        selectedPanel.schedules.map((s: any) => (
                          <div key={s.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                            <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{s.application?.surname}, {s.application?.firstName}</p>
                              <p className="text-xs text-gray-500">{new Date(s.scheduledAt).toLocaleString('en-UG', { timeZone: 'Africa/Kampala' })} &bull; {s.slotMinutes} min</p>
                            </div>
                            <span className="badge bg-blue-100 text-blue-700">{s.application?.applicationRef}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'scores' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Panel picker */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Select Panel</p>
                <div className="space-y-2">
                  {panels.map(p => (
                    <button key={p.id} onClick={() => setSelectedPanel(p)} className={cn('w-full text-left card p-3 text-sm transition-all', selectedPanel?.id === p.id ? 'ring-2 ring-blue-600' : 'hover:shadow-sm')}>
                      <p className="font-medium">{p.cycle?.postReference}</p>
                      <p className="text-xs text-gray-400">{p.scores?.length ?? 0} scores submitted</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Score entry */}
              {canScore && selectedPanel && (
                <div className="card p-5">
                  <h3 className="mb-4">Submit Interview Score</h3>
                  <form onSubmit={submitScore} className="space-y-3">
                    <div>
                      <label className="label">Candidate</label>
                      <select className="select" value={scoreForm.applicationId} onChange={e => setScoreForm({ ...scoreForm, applicationId: e.target.value })} required>
                        <option value="">Select candidate…</option>
                        {(selectedPanel.schedules || []).map((s: any) => (
                          <option key={s.applicationId} value={s.applicationId}>
                            {s.application?.surname}, {s.application?.firstName}
                          </option>
                        ))}
                      </select>
                    </div>
                    {[
                      ['technicalScore', 'Technical Knowledge', 40],
                      ['communicationScore', 'Communication', 25],
                      ['leadershipScore', 'Leadership', 20],
                      ['professionalismScore', 'Professionalism', 15],
                    ].map(([field, label, max]) => (
                      <div key={field as string}>
                        <label className="label">{label} <span className="text-gray-400">/ {max}</span></label>
                        <input className="input" type="number" min={0} max={max as number}
                          value={scoreForm[field as keyof typeof scoreForm] as number}
                          onChange={e => setScoreForm({ ...scoreForm, [field as string]: +e.target.value })}
                        />
                      </div>
                    ))}
                    <div className="flex justify-between py-2 border-t">
                      <span className="font-semibold">Total</span>
                      <span className={cn('font-bold text-lg', totalScore >= 60 ? 'text-green-700' : 'text-red-600')}>{totalScore} / 100</span>
                    </div>
                    <div>
                      <label className="label">Recommendation</label>
                      <select className="select" value={scoreForm.recommendation} onChange={e => setScoreForm({ ...scoreForm, recommendation: e.target.value })}>
                        <option value="appoint">Appoint</option>
                        <option value="reserve">Reserve</option>
                        <option value="reject">Reject</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Remarks</label>
                      <textarea className="input" rows={2} value={scoreForm.remarks} onChange={e => setScoreForm({ ...scoreForm, remarks: e.target.value })} />
                    </div>
                    <button type="submit" className="btn-primary w-full" disabled={saving}>{saving ? 'Saving…' : 'Submit Score'}</button>
                  </form>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
