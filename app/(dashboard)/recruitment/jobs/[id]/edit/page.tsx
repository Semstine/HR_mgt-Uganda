'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Header from '@/components/layout/header'
import { Loader2, Save } from 'lucide-react'

const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'CONSULTANT']
const EXPERIENCE_LEVELS = ['Entry Level (0-2 years)', 'Mid Level (2-5 years)', 'Senior Level (5-8 years)', 'Lead/Manager (8+ years)']

export default function EditJobPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [skillInput, setSkillInput] = useState({ required: '', preferred: '' })

  const [form, setForm] = useState({
    title: '', location: '', employmentType: 'FULL_TIME', experienceLevel: '',
    description: '', responsibilities: '', education: '',
    salaryMin: '', salaryMax: '', deadline: '', status: 'DRAFT',
    requiredSkills: [] as string[],
    preferredSkills: [] as string[],
    screeningKeywords: [] as string[],
    interviewQuestions: [] as string[],
  })

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then((r) => r.json())
      .then(({ job }) => {
        if (!job) return
        setForm({
          title: job.title ?? '',
          location: job.location ?? '',
          employmentType: job.employmentType ?? 'FULL_TIME',
          experienceLevel: job.experienceLevel ?? '',
          description: job.description ?? '',
          responsibilities: job.responsibilities ?? '',
          education: job.education ?? '',
          salaryMin: job.salaryMin?.toString() ?? '',
          salaryMax: job.salaryMax?.toString() ?? '',
          deadline: job.deadline ? job.deadline.slice(0, 10) : '',
          status: job.status ?? 'DRAFT',
          requiredSkills: job.requiredSkills ?? [],
          preferredSkills: job.preferredSkills ?? [],
          screeningKeywords: job.screeningKeywords ?? [],
          interviewQuestions: job.interviewQuestions ?? [],
        })
      })
      .finally(() => setLoading(false))
  }, [id])

  function addSkill(type: 'required' | 'preferred') {
    const val = type === 'required' ? skillInput.required.trim() : skillInput.preferred.trim()
    if (!val) return
    if (type === 'required') {
      setForm((f) => ({ ...f, requiredSkills: [...f.requiredSkills, val] }))
      setSkillInput((s) => ({ ...s, required: '' }))
    } else {
      setForm((f) => ({ ...f, preferredSkills: [...f.preferredSkills, val] }))
      setSkillInput((s) => ({ ...s, preferred: '' }))
    }
  }

  function removeSkill(type: 'required' | 'preferred', skill: string) {
    if (type === 'required') setForm((f) => ({ ...f, requiredSkills: f.requiredSkills.filter((s) => s !== skill) }))
    else setForm((f) => ({ ...f, preferredSkills: f.preferredSkills.filter((s) => s !== skill) }))
  }

  async function handleSave(newStatus?: string) {
    if (!form.title) { alert('Job title is required'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          status: newStatus ?? form.status,
          salaryMin: form.salaryMin ? parseFloat(form.salaryMin) : null,
          salaryMax: form.salaryMax ? parseFloat(form.salaryMax) : null,
          deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/recruitment/jobs/${id}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </main>
    )
  }

  return (
    <main className="flex-1">
      <Header title="Edit Job" subtitle={form.title} />
      <div className="p-6 max-w-3xl mx-auto space-y-5">

        {/* Basic info */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Job title *</label>
              <input className="input" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="label">Employment type</label>
              <select className="select" value={form.employmentType}
                onChange={(e) => setForm({ ...form, employmentType: e.target.value })}>
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="select" value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED'].map((s) => (
                  <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" placeholder="e.g. Kampala, Uganda" value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div>
              <label className="label">Experience level</label>
              <select className="select" value={form.experienceLevel}
                onChange={(e) => setForm({ ...form, experienceLevel: e.target.value })}>
                <option value="">Select level</option>
                {EXPERIENCE_LEVELS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Min salary (UGX)</label>
              <input type="number" className="input" value={form.salaryMin}
                onChange={(e) => setForm({ ...form, salaryMin: e.target.value })} />
            </div>
            <div>
              <label className="label">Max salary (UGX)</label>
              <input type="number" className="input" value={form.salaryMax}
                onChange={(e) => setForm({ ...form, salaryMax: e.target.value })} />
            </div>
            <div>
              <label className="label">Application deadline</label>
              <input type="date" className="input" value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Job details */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Job Details</h2>
          <div>
            <label className="label">Job description</label>
            <textarea className="input" rows={5} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Key responsibilities</label>
            <textarea className="input" rows={5} value={form.responsibilities}
              onChange={(e) => setForm({ ...form, responsibilities: e.target.value })} />
          </div>
          <div>
            <label className="label">Education requirements</label>
            <input className="input" value={form.education}
              onChange={(e) => setForm({ ...form, education: e.target.value })} />
          </div>
        </div>

        {/* Skills */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Skills</h2>
          <div>
            <label className="label">Required skills</label>
            <div className="flex gap-2 mb-2">
              <input className="input" placeholder="Add a skill and press Enter"
                value={skillInput.required}
                onChange={(e) => setSkillInput((s) => ({ ...s, required: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill('required'))} />
              <button onClick={() => addSkill('required')} className="btn-secondary">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.requiredSkills.map((s) => (
                <span key={s} className="badge bg-blue-50 text-blue-700 gap-1">
                  {s}
                  <button onClick={() => removeSkill('required', s)} className="text-blue-400 hover:text-blue-700">✕</button>
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Preferred skills</label>
            <div className="flex gap-2 mb-2">
              <input className="input" placeholder="Add a preferred skill"
                value={skillInput.preferred}
                onChange={(e) => setSkillInput((s) => ({ ...s, preferred: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill('preferred'))} />
              <button onClick={() => addSkill('preferred')} className="btn-secondary">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.preferredSkills.map((s) => (
                <span key={s} className="badge bg-gray-100 text-gray-600 gap-1">
                  {s}
                  <button onClick={() => removeSkill('preferred', s)} className="text-gray-400 hover:text-gray-700">✕</button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Screening keywords */}
        {form.screeningKeywords.length > 0 && (
          <div className="card p-6 space-y-3">
            <h2 className="font-semibold text-gray-900">Screening Keywords</h2>
            <div className="flex flex-wrap gap-2">
              {form.screeningKeywords.map((k) => (
                <span key={k} className="badge bg-purple-50 text-purple-700 gap-1">
                  {k}
                  <button onClick={() => setForm((f) => ({ ...f, screeningKeywords: f.screeningKeywords.filter((x) => x !== k) }))} className="text-purple-400 hover:text-purple-700">✕</button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pb-6">
          <button onClick={() => router.back()} className="btn-secondary">Cancel</button>
          <div className="flex gap-3">
            <button onClick={() => handleSave('DRAFT')} disabled={saving} className="btn-secondary">
              Save as Draft
            </button>
            <button onClick={() => handleSave()} disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
