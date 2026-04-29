'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/header'
import { CandidateStatusBadge, ScoreBadge } from '@/components/ui/status-badge'
import { formatDate, formatCurrency } from '@/lib/utils'
import { CANDIDATE_STATUS_LABELS } from '@/types'
import {
  Loader2, Mail, Phone, MapPin, Linkedin, FileText, Sparkles, Info,
} from 'lucide-react'

type Comm = {
  id: string
  subject: string
  body?: string
  status: string
  sentAt?: string
  createdAt: string
}

type Candidate = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  location?: string
  linkedIn?: string
  status: string
  screeningScore?: number
  screeningNotes?: string
  screeningData?: { breakdown?: Record<string, number>; strengths?: string[]; gaps?: string[]; explanation?: string }
  applicationDate: string
  resumeUrl?: string
  notes?: string
  job: { id: string; title: string; location?: string; salaryMin?: number; salaryMax?: number; currency: string; interviewQuestions: string[] }
  interviews: { id: string; scheduledAt: string; type: string; status: string; feedback?: string; score?: number }[]
  statusHistory: { toStatus: string; reason?: string; changedBy?: string; createdAt: string }[]
  communications: Comm[]
}

const STATUSES = [
  'RECEIVED', 'UNDER_REVIEW', 'SHORTLISTED', 'REJECTED',
  'PHONE_INTERVIEW_INVITED', 'INTERVIEW_SCHEDULED', 'FINAL_INTERVIEW',
  'OFFER_SENT', 'OFFER_ACCEPTED', 'ONBOARDING',
]

const COMM_STATUS_COLORS: Record<string, string> = {
  sent: 'bg-green-100 text-green-700',
  approved: 'bg-blue-100 text-blue-700',
  failed: 'bg-red-100 text-red-700',
  pending_approval: 'bg-yellow-100 text-yellow-700',
  draft: 'bg-gray-100 text-gray-600',
}

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [screening, setScreening] = useState(false)
  const [statusUpdate, setStatusUpdate] = useState({ status: '', reason: '' })
  const [tab, setTab] = useState<'overview' | 'screening' | 'interviews' | 'comms' | 'history'>('overview')
  const [emailForm, setEmailForm] = useState({ type: 'application_received', subject: '', body: '', commId: '' })
  const [emailLoading, setEmailLoading] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [interviewForm, setInterviewForm] = useState({ scheduledAt: '', type: 'in-person', interviewers: '', location: '', meetingLink: '' })
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  useEffect(() => { fetchCandidate() }, [id])

  async function fetchCandidate() {
    setLoading(true)
    try {
      const res = await fetch(`/api/candidates/${id}`)
      const data = await res.json()
      setCandidate(data.candidate)
      setStatusUpdate((s) => ({ ...s, status: data.candidate.status }))
      setNotes(data.candidate.notes || '')
    } finally {
      setLoading(false)
    }
  }

  async function runScreening() {
    setScreening(true)
    try {
      await fetch(`/api/candidates/${id}/screen`, { method: 'POST' })
      await fetchCandidate()
    } finally {
      setScreening(false)
    }
  }

  async function updateStatus() {
    if (!statusUpdate.status) return
    await fetch(`/api/candidates/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(statusUpdate),
    })
    await fetchCandidate()
  }

  async function generateEmail() {
    setEmailLoading(true)
    try {
      const res = await fetch('/api/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: id, type: emailForm.type, generateAI: true }),
      })
      const data = await res.json()
      if (data.comm) {
        setEmailForm((f) => ({ ...f, subject: data.comm.subject, body: data.comm.body, commId: data.comm.id }))
        await fetchCandidate()
      }
    } finally {
      setEmailLoading(false)
    }
  }

  async function saveNotes() {
    setSavingNotes(true)
    try {
      await fetch(`/api/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
    } finally {
      setSavingNotes(false)
    }
  }

  async function sendEmailNow() {
    if (!emailForm.commId) return
    setSendingEmail(true)
    try {
      const res = await fetch(`/api/communications/${emailForm.commId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendNow: true }),
      })
      const data = await res.json()
      if (res.ok) {
        alert('Email sent successfully!')
        setEmailForm({ type: 'application_received', subject: '', body: '', commId: '' })
        await fetchCandidate()
      } else {
        alert(data.error || 'Failed to send email')
      }
    } finally {
      setSendingEmail(false)
    }
  }

  async function scheduleInterview() {
    await fetch('/api/candidates/' + id + '/interview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...interviewForm, interviewers: interviewForm.interviewers.split(',').map(s => s.trim()) }),
    })
    await fetchCandidate()
  }

  if (loading) return (
    <main className="flex-1 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
    </main>
  )
  if (!candidate) return <main className="flex-1 p-6"><p>Candidate not found</p></main>

  return (
    <main className="flex-1">
      <Header title={`${candidate.firstName} ${candidate.lastName}`} subtitle={`Applied for ${candidate.job.title}`} />
      <div className="p-6 space-y-5">

        {/* Header card */}
        <div className="card p-6 flex flex-wrap items-start gap-5">
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-blue-700">{candidate.firstName[0]}{candidate.lastName[0]}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3 flex-wrap">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{candidate.firstName} {candidate.lastName}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{candidate.job.title}</p>
              </div>
              <CandidateStatusBadge status={candidate.status as never} />
              <ScoreBadge score={candidate.screeningScore} />
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-3">
              <a href={`mailto:${candidate.email}`} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600">
                <Mail className="w-3.5 h-3.5" /> {candidate.email}
              </a>
              {candidate.phone && <span className="flex items-center gap-1.5 text-sm text-gray-600"><Phone className="w-3.5 h-3.5" /> {candidate.phone}</span>}
              {candidate.location && <span className="flex items-center gap-1.5 text-sm text-gray-500"><MapPin className="w-3.5 h-3.5" /> {candidate.location}</span>}
              {candidate.linkedIn && <a href={candidate.linkedIn} target="_blank" className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"><Linkedin className="w-3.5 h-3.5" /> LinkedIn</a>}
              {candidate.resumeUrl && <a href={candidate.resumeUrl} target="_blank" className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"><FileText className="w-3.5 h-3.5" /> Resume</a>}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={runScreening} disabled={screening} className="btn-primary text-xs">
              {screening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {screening ? 'Screening…' : 'Run AI Screen'}
            </button>
            {candidate.status !== 'EMPLOYEE_ACTIVE' && (
              <Link href={`/recruitment/candidates/${id}/offer`} className="btn-secondary text-xs text-center">
                Generate Offer
              </Link>
            )}
          </div>
        </div>

        {/* Status Update */}
        <div className="card p-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Move to:</span>
          <select className="select w-56 text-sm" value={statusUpdate.status}
            onChange={(e) => setStatusUpdate((s) => ({ ...s, status: e.target.value }))}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{CANDIDATE_STATUS_LABELS[s as never]}</option>
            ))}
          </select>
          <input className="input w-56 text-sm" placeholder="Reason (optional)" value={statusUpdate.reason}
            onChange={(e) => setStatusUpdate((s) => ({ ...s, reason: e.target.value }))} />
          <button onClick={updateStatus} className="btn-primary text-sm">Update Status</button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex gap-1">
            {(['overview', 'screening', 'interviews', 'comms', 'history'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {t === 'comms' ? 'Communications' : t}
              </button>
            ))}
          </div>
        </div>

        {tab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Application Info</h3>
              <dl className="space-y-2">
                <div className="flex justify-between text-sm"><dt className="text-gray-500">Applied</dt><dd className="font-medium">{formatDate(candidate.applicationDate)}</dd></div>
                <div className="flex justify-between text-sm"><dt className="text-gray-500">Position</dt><dd className="font-medium">{candidate.job.title}</dd></div>
                {candidate.job.location && <div className="flex justify-between text-sm"><dt className="text-gray-500">Job Location</dt><dd>{candidate.job.location}</dd></div>}
                {candidate.job.salaryMin && <div className="flex justify-between text-sm"><dt className="text-gray-500">Salary Range</dt><dd>{formatCurrency(candidate.job.salaryMin, candidate.job.currency)} – {formatCurrency(candidate.job.salaryMax ?? 0, candidate.job.currency)}</dd></div>}
              </dl>
            </div>
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Notes</h3>
              <textarea
                className="input h-32 text-sm"
                placeholder="Add HR notes…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <button
                onClick={saveNotes}
                disabled={savingNotes}
                className="btn-secondary mt-2 text-xs flex items-center gap-1.5"
              >
                {savingNotes && <Loader2 className="w-3 h-3 animate-spin" />}
                {savingNotes ? 'Saving…' : 'Save notes'}
              </button>
            </div>
          </div>
        )}

        {tab === 'screening' && (
          <div className="space-y-4">
            {!candidate.screeningScore ? (
              <div className="card p-8 text-center">
                <Sparkles className="w-10 h-10 text-purple-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-3">This candidate hasn't been screened yet</p>
                <button onClick={runScreening} disabled={screening} className="btn-primary">
                  {screening ? 'Running AI Screen…' : 'Run AI Resume Screening'}
                </button>
              </div>
            ) : (
              <>
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">AI Screening Score</h3>
                    <ScoreBadge score={candidate.screeningScore} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(candidate.screeningData?.breakdown || {}).map(([key, val]) => (
                      <div key={key} className="p-3 bg-gray-50 rounded-lg text-center">
                        <p className="text-lg font-bold text-gray-900">{(val as number).toFixed(0)}%</p>
                        <p className="text-xs text-gray-500 capitalize">{key}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {candidate.screeningData?.explanation && (
                  <div className="card p-5">
                    <h3 className="font-semibold mb-2">AI Assessment</h3>
                    <p className="text-sm text-gray-700">{candidate.screeningData.explanation}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {candidate.screeningData?.strengths && candidate.screeningData.strengths.length > 0 && (
                    <div className="card p-5">
                      <h3 className="font-semibold text-green-700 mb-2">Strengths</h3>
                      <ul className="space-y-1.5">
                        {candidate.screeningData.strengths.map((s: string) => (
                          <li key={s} className="text-sm text-gray-700 flex gap-2">
                            <span className="text-green-500">✓</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {candidate.screeningData?.gaps && candidate.screeningData.gaps.length > 0 && (
                    <div className="card p-5">
                      <h3 className="font-semibold text-red-600 mb-2">Gaps</h3>
                      <ul className="space-y-1.5">
                        {candidate.screeningData.gaps.map((g: string) => (
                          <li key={g} className="text-sm text-gray-700 flex gap-2">
                            <span className="text-red-400">!</span> {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'interviews' && (
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="font-semibold mb-4">Schedule Interview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="label">Date & Time</label><input type="datetime-local" className="input" value={interviewForm.scheduledAt} onChange={(e) => setInterviewForm((f) => ({ ...f, scheduledAt: e.target.value }))} /></div>
                <div><label className="label">Type</label>
                  <select className="select" value={interviewForm.type} onChange={(e) => setInterviewForm((f) => ({ ...f, type: e.target.value }))}>
                    <option value="in-person">In Person</option>
                    <option value="phone">Phone</option>
                    <option value="video">Video</option>
                  </select>
                </div>
                <div><label className="label">Interviewers (comma-separated)</label><input className="input" placeholder="Jane Nakato, John Okello" value={interviewForm.interviewers} onChange={(e) => setInterviewForm((f) => ({ ...f, interviewers: e.target.value }))} /></div>
                <div><label className="label">Location / Meeting Link</label><input className="input" placeholder="Office Room 2 or Zoom link" value={interviewForm.location || interviewForm.meetingLink} onChange={(e) => setInterviewForm((f) => ({ ...f, location: e.target.value }))} /></div>
              </div>
              <button onClick={scheduleInterview} className="btn-primary mt-3">Schedule Interview</button>
            </div>
            {candidate.interviews.length > 0 && (
              <div className="card divide-y divide-gray-50">
                {candidate.interviews.map((i) => (
                  <div key={i.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{new Date(i.scheduledAt).toLocaleString('en-UG')}</p>
                      <p className="text-xs text-gray-500 capitalize">{i.type} interview</p>
                    </div>
                    <span className={`badge ${i.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{i.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'comms' && (
          <div className="space-y-4">
            {/* Workflow explanation */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
              <div className="text-blue-700">
                <p className="font-medium">How email communications work</p>
                <p className="text-blue-600 mt-0.5">
                  AI-generated emails are saved as <strong>drafts</strong> — they are <strong>not sent automatically</strong>.
                  You can approve and send directly here, or review all pending emails in{' '}
                  <Link href="/communications" className="underline font-medium">Communications</Link>.
                </p>
              </div>
            </div>

            {/* Generate email */}
            <div className="card p-5 space-y-4">
              <h3 className="font-semibold">Generate Email</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Email type</label>
                  <select className="select" value={emailForm.type} onChange={(e) => setEmailForm((f) => ({ ...f, type: e.target.value }))}>
                    <option value="application_received">Application Received</option>
                    <option value="rejected">Rejection</option>
                    <option value="phone_interview">Phone Interview Invite</option>
                    <option value="interview_scheduled">Interview Scheduled</option>
                    <option value="offer">Offer Letter</option>
                    <option value="onboarding">Onboarding Instructions</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={generateEmail} disabled={emailLoading} className="btn-primary w-full">
                    {emailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {emailLoading ? 'Generating…' : 'Generate Email'}
                  </button>
                </div>
              </div>
              {emailForm.subject && (
                <>
                  <div><label className="label">Subject</label><input className="input" value={emailForm.subject} onChange={(e) => setEmailForm((f) => ({ ...f, subject: e.target.value }))} /></div>
                  <div><label className="label">Body</label><textarea className="input" rows={8} value={emailForm.body} onChange={(e) => setEmailForm((f) => ({ ...f, body: e.target.value }))} /></div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-green-600 font-medium">✓ Saved as draft</span>
                    <div className="ml-auto flex gap-3">
                      <Link href="/communications" className="btn-secondary text-sm">
                        Review in Communications
                      </Link>
                      <button onClick={sendEmailNow} disabled={sendingEmail} className="btn-primary text-sm">
                        {sendingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                        {sendingEmail ? 'Sending…' : 'Approve & Send'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Communication history */}
            {candidate.communications.length > 0 && (
              <div className="card overflow-hidden">
                <p className="px-5 py-3 text-sm font-semibold text-gray-700 border-b border-gray-100">Communication History</p>
                <div className="divide-y divide-gray-50">
                  {candidate.communications.map((c) => (
                    <div key={c.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{c.subject}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(c.createdAt)}</p>
                      </div>
                      <span className={`badge ${COMM_STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="card divide-y divide-gray-50">
            {candidate.statusHistory.length === 0 ? (
              <p className="p-6 text-sm text-gray-400 text-center">No status history yet</p>
            ) : candidate.statusHistory.map((h, i) => (
              <div key={i} className="p-4 flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {CANDIDATE_STATUS_LABELS[h.toStatus as never]}
                  </p>
                  {h.reason && <p className="text-xs text-gray-500 mt-0.5">{h.reason}</p>}
                </div>
                <span className="text-xs text-gray-400">{formatDate(h.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
