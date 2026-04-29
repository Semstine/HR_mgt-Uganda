'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/header'
import { Sparkles, Loader2, CheckCircle2, ChevronDown } from 'lucide-react'

const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'CONSULTANT']
const EXPERIENCE_LEVELS = ['Entry Level (0-2 years)', 'Mid Level (2-5 years)', 'Senior Level (5-8 years)', 'Lead/Manager (8+ years)']

export default function NewJobPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [aiApproved, setAiApproved] = useState(false)

  const [form, setForm] = useState({
    title: '', departmentId: '', location: '', employmentType: 'FULL_TIME',
    description: '', responsibilities: '', requiredSkills: [] as string[],
    preferredSkills: [] as string[], experienceLevel: '', education: '',
    salaryMin: '', salaryMax: '', deadline: '', status: 'DRAFT',
    screeningKeywords: [] as string[], interviewQuestions: [] as string[],
  })
  const [skillInput, setSkillInput] = useState({ required: '', preferred: '' })

  async function generateWithAI() {
    if (!form.title) { alert('Enter a job title first'); return }
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/generate-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, industry: 'Technology', experienceLevel: form.experienceLevel, location: form.location }),
      })
      const data = await res.json()
      if (data.result) {
        setForm((f) => ({
          ...f,
          description: data.result.description || f.description,
          responsibilities: data.result.responsibilities || f.responsibilities,
          requiredSkills: data.result.requiredSkills || f.requiredSkills,
          preferredSkills: data.result.preferredSkills || f.preferredSkills,
          education: data.result.education || f.education,
          screeningKeywords: data.result.screeningKeywords || f.screeningKeywords,
          interviewQuestions: data.result.interviewQuestions || f.interviewQuestions,
        }))
        setShowAI(true)
      }
    } catch {
      alert('AI generation failed. You can fill in the details manually.')
    } finally {
      setAiLoading(false)
    }
  }

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

  async function handleSubmit(status: 'DRAFT' | 'ACTIVE') {
    if (!form.title) { alert('Job title is required'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, status, salaryMin: form.salaryMin ? parseFloat(form.salaryMin) : null, salaryMax: form.salaryMax ? parseFloat(form.salaryMax) : null, aiApproved }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/recruitment/jobs/${data.job.id}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create job')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex-1">
      <Header title="Post New Job" subtitle="Create a job opening with AI assistance" />
      <div className="p-6 max-w-3xl mx-auto space-y-5">
        {/* Basic Info */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 mb-1">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Job title *</label>
              <div className="flex gap-2">
                <input className="input flex-1" placeholder="e.g. Marketing Manager, Software Engineer"
                  value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <button onClick={generateWithAI} disabled={aiLoading} className="btn-primary flex-shrink-0">
                  {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span className="hidden sm:inline">AI Fill</span>
                </button>
              </div>
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
              <label className="label">Application deadline</label>
              <input type="date" className="input" value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
            <div>
              <label className="label">Min salary (UGX)</label>
              <input type="number" className="input" placeholder="e.g. 1500000" value={form.salaryMin}
                onChange={(e) => setForm({ ...form, salaryMin: e.target.value })} />
            </div>
            <div>
              <label className="label">Max salary (UGX)</label>
              <input type="number" className="input" placeholder="e.g. 3000000" value={form.salaryMax}
                onChange={(e) => setForm({ ...form, salaryMax: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Job Details */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 mb-1">Job Details</h2>
          <div>
            <label className="label">Job description</label>
            <textarea className="input" rows={5} placeholder="Overview of the role and company…"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Key responsibilities</label>
            <textarea className="input" rows={5} placeholder="• Manage day-to-day operations&#10;• Lead a team of …"
              value={form.responsibilities} onChange={(e) => setForm({ ...form, responsibilities: e.target.value })} />
          </div>
          <div>
            <label className="label">Education requirements</label>
            <input className="input" placeholder="e.g. Bachelor's degree in Business or related field"
              value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} />
          </div>
        </div>

        {/* Skills */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 mb-1">Skills</h2>
          <div>
            <label className="label">Required skills</label>
            <div className="flex gap-2 mb-2">
              <input className="input" placeholder="Add a skill, press Enter"
                value={skillInput.required} onChange={(e) => setSkillInput((s) => ({ ...s, required: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill('required'))} />
              <button onClick={() => addSkill('required')} className="btn-secondary">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.requiredSkills.map((s) => (
                <span key={s} className="badge bg-blue-50 text-blue-700 gap-1">
                  {s}
                  <button onClick={() => setForm((f) => ({ ...f, requiredSkills: f.requiredSkills.filter((x) => x !== s) }))} className="text-blue-400 hover:text-blue-700">✕</button>
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Preferred skills</label>
            <div className="flex gap-2 mb-2">
              <input className="input" placeholder="Add a preferred skill"
                value={skillInput.preferred} onChange={(e) => setSkillInput((s) => ({ ...s, preferred: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill('preferred'))} />
              <button onClick={() => addSkill('preferred')} className="btn-secondary">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.preferredSkills.map((s) => (
                <span key={s} className="badge bg-gray-100 text-gray-600 gap-1">
                  {s}
                  <button onClick={() => setForm((f) => ({ ...f, preferredSkills: f.preferredSkills.filter((x) => x !== s) }))} className="text-gray-400 hover:text-gray-700">✕</button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* AI Screening Criteria */}
        {showAI && form.screeningKeywords.length > 0 && (
          <div className="card p-6 border-l-4 border-purple-400 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h2 className="font-semibold text-purple-900">AI Screening Criteria</h2>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">Screening keywords (used to score resumes)</p>
              <div className="flex flex-wrap gap-2">
                {form.screeningKeywords.map((k) => <span key={k} className="badge bg-purple-50 text-purple-700">{k}</span>)}
              </div>
            </div>
            {form.interviewQuestions.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Suggested interview questions</p>
                <ol className="space-y-1.5">
                  {form.interviewQuestions.map((q, i) => (
                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-purple-600 font-medium flex-shrink-0">{i + 1}.</span> {q}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <div className="flex items-center gap-3 pt-2">
              <input type="checkbox" id="approveAI" checked={aiApproved}
                onChange={(e) => setAiApproved(e.target.checked)} className="w-4 h-4 accent-purple-600" />
              <label htmlFor="approveAI" className="text-sm text-gray-700">
                I approve these AI-generated screening criteria for use in resume scoring
              </label>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pb-6">
          <button onClick={() => router.back()} className="btn-secondary">Cancel</button>
          <div className="flex gap-3">
            <button onClick={() => handleSubmit('DRAFT')} disabled={loading} className="btn-secondary">
              Save as Draft
            </button>
            <button onClick={() => handleSubmit('ACTIVE')} disabled={loading} className="btn-primary">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Publish Job
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
