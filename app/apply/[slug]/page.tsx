'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, Upload, CheckCircle2, X, Briefcase, MapPin, Clock } from 'lucide-react'

type Job = {
  id: string
  title: string
  location?: string
  employmentType: string
  description?: string
  responsibilities?: string
  requiredSkills: string[]
  deadline?: string
  company: { name: string }
}

export default function PublicApplicationPage() {
  const { slug } = useParams<{ slug: string }>()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    location: '', linkedIn: '', coverLetter: '',
  })

  useEffect(() => {
    fetch(`/api/jobs/public/${slug}`)
      .then((r) => r.json())
      .then((d) => { setJob(d.job); setLoading(false) })
      .catch(() => setLoading(false))
  }, [slug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.firstName || !form.lastName || !form.email) {
      setError('Please fill in all required fields')
      return
    }
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, jobId: job!.id, source: 'public_link' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (fileRef.current?.files?.[0] && data.candidate) {
        const fd = new FormData()
        fd.append('file', fileRef.current.files[0])
        fd.append('candidateId', data.candidate.id)
        fd.append('type', 'resume')
        await fetch('/api/upload', { method: 'POST', body: fd })
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Application failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
    </div>
  )

  if (!job) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <X className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Job not found</p>
        <p className="text-sm text-gray-400 mt-1">This position may have been closed or the link is invalid.</p>
      </div>
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
        <p className="text-gray-500">Thank you for applying for the <strong>{job.title}</strong> position at <strong>{job.company.name}</strong>.</p>
        <p className="text-sm text-gray-400 mt-3">You will be contacted if you are shortlisted for the next stage.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Job header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>
              <p className="text-gray-500 mt-0.5">{job.company.name}</p>
              <div className="flex flex-wrap gap-3 mt-2">
                {job.location && <span className="flex items-center gap-1 text-sm text-gray-400"><MapPin className="w-3.5 h-3.5" /> {job.location}</span>}
                <span className="flex items-center gap-1 text-sm text-gray-400">
                  <Clock className="w-3.5 h-3.5" />
                  {job.employmentType.replace(/_/g, ' ')}
                </span>
                {job.deadline && <span className="text-sm text-red-500">Closes {new Date(job.deadline).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
              </div>
            </div>
          </div>

          {job.description && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">About the Role</h3>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{job.description}</p>
            </div>
          )}

          {job.requiredSkills.length > 0 && (
            <div className="mt-3">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.requiredSkills.map((s) => (
                  <span key={s} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Application form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-5">Apply for this Position</h2>

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First name *</label>
                <input className="input" placeholder="Jane" value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              </div>
              <div>
                <label className="label">Last name *</label>
                <input className="input" placeholder="Nakato" value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              </div>
            </div>
            <div>
              <label className="label">Email address *</label>
              <input type="email" className="input" placeholder="jane@email.com" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Phone number</label>
                <input className="input" placeholder="+256 700 000 000" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">Location</label>
                <input className="input" placeholder="Kampala, Uganda" value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">LinkedIn profile</label>
              <input className="input" placeholder="https://linkedin.com/in/yourname" value={form.linkedIn}
                onChange={(e) => setForm({ ...form, linkedIn: e.target.value })} />
            </div>
            <div>
              <label className="label">Resume / CV (PDF or DOCX, max 10MB)</label>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                {fileName ? (
                  <p className="text-sm font-medium text-blue-600">{fileName}</p>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 font-medium">Click to upload your resume</p>
                    <p className="text-xs text-gray-400 mt-1">PDF or DOCX, max 10MB</p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
                onChange={(e) => setFileName(e.target.files?.[0]?.name || '')} />
            </div>
            <div>
              <label className="label">Cover letter (optional)</label>
              <textarea className="input" rows={4} placeholder="Briefly explain why you're the best candidate for this role…"
                value={form.coverLetter} onChange={(e) => setForm({ ...form, coverLetter: e.target.value })} />
            </div>
            <button type="submit" disabled={submitting} className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : 'Submit Application'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by TalentBridge Africa · Your data is handled securely
        </p>
      </div>
    </div>
  )
}
