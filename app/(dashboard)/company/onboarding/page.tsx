'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/header'
import { Building2, Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

const INDUSTRIES = ['Technology', 'Finance & Banking', 'Healthcare', 'Education', 'Manufacturing', 'Retail & Commerce', 'Agriculture', 'NGO / Non-profit', 'Government', 'Hospitality & Tourism', 'Construction & Real Estate', 'Logistics & Transport', 'Media & Communications', 'Professional Services', 'Other']
const SIZES = ['1-10', '11-50', '51-200', '201-500', '500+']

export default function CompanyOnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<{
    suggestedRoles: string[]
    departmentStructure: { name: string; roles: string[] }[]
    hiringPriorities: string[]
    hrWorkflows: string[]
    insights: string
  } | null>(null)
  const [approvedSuggestions, setApprovedSuggestions] = useState(false)
  const [form, setForm] = useState({
    name: '', industry: '', productsServices: '', size: '', location: 'Kampala, Uganda',
    website: '', currentHrProcess: '',
    departments: [''] as string[],
  })

  async function getAISuggestions() {
    setAiLoading(true)
    try {
      const res = await fetch('/api/company/ai-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      setSuggestions(data.suggestions)
    } catch {
      alert('Could not get AI suggestions. Check your API key.')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleComplete() {
    setLoading(true)
    try {
      const res = await fetch('/api/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, aiSuggestions: suggestions, setupComplete: true }),
      })
      if (!res.ok) throw new Error('Failed to save company')
      router.push('/dashboard')
    } catch {
      alert('Failed to save company setup. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const addDept = () => setForm({ ...form, departments: [...form.departments, ''] })
  const updateDept = (i: number, val: string) => {
    const d = [...form.departments]
    d[i] = val
    setForm({ ...form, departments: d })
  }
  const removeDept = (i: number) => setForm({ ...form, departments: form.departments.filter((_, idx) => idx !== i) })

  return (
    <main className="flex-1">
      <Header title="Company Setup" subtitle="Configure your company profile to get started" />
      <div className="p-6 max-w-3xl mx-auto">
        {/* Progress */}
        <div className="flex items-center gap-3 mb-8">
          {['Company Info', 'Departments', 'AI Setup'].map((label, i) => (
            <div key={label} className="flex items-center gap-3 flex-1 last:flex-initial">
              <div className={`flex items-center gap-2 text-sm font-medium ${step > i + 1 ? 'text-green-600' : step === i + 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step > i + 1 ? 'bg-green-600 text-white' : step === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {step > i + 1 ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className="hidden sm:block">{label}</span>
              </div>
              {i < 2 && <div className={`flex-1 h-0.5 ${step > i + 1 ? 'bg-green-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="card p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h2>Company Information</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="label">Company name *</label>
                <input className="input" placeholder="Acme Uganda Ltd" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Industry *</label>
                <select className="select" value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}>
                  <option value="">Select industry</option>
                  {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Company size</label>
                <select className="select" value={form.size}
                  onChange={(e) => setForm({ ...form, size: e.target.value })}>
                  <option value="">Select size</option>
                  {SIZES.map((s) => <option key={s}>{s} employees</option>)}
                </select>
              </div>
              <div>
                <label className="label">Location</label>
                <input className="input" placeholder="Kampala, Uganda" value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div>
                <label className="label">Website</label>
                <input className="input" placeholder="https://yourcompany.co.ug" value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="label">Products / Services</label>
                <textarea className="input" rows={2} placeholder="What does your company do?"
                  value={form.productsServices}
                  onChange={(e) => setForm({ ...form, productsServices: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="label">Current HR process</label>
                <textarea className="input" rows={2} placeholder="e.g. Manual paper-based, Excel spreadsheets, no formal process…"
                  value={form.currentHrProcess}
                  onChange={(e) => setForm({ ...form, currentHrProcess: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end">
              <button className="btn-primary" onClick={() => setStep(2)}
                disabled={!form.name || !form.industry}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="card p-6 space-y-5">
            <h2>Departments</h2>
            <p className="text-sm text-gray-500">Add your company departments. You can always add more later.</p>
            <div className="space-y-3">
              {form.departments.map((dept, i) => (
                <div key={i} className="flex gap-2">
                  <input className="input" placeholder={`e.g. Finance, HR, Operations`} value={dept}
                    onChange={(e) => updateDept(i, e.target.value)} />
                  {form.departments.length > 1 && (
                    <button onClick={() => removeDept(i)} className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm">✕</button>
                  )}
                </div>
              ))}
              <button onClick={addDept} className="btn-secondary text-sm">+ Add department</button>
            </div>
            <div className="flex justify-between">
              <button className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
              <button className="btn-primary" onClick={() => setStep(3)}>Continue →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h2>AI Setup Suggestions</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Let our AI analyze your company profile and suggest roles, department structure, and HR workflows tailored for {form.location || 'your location'}.
              </p>
              {!suggestions && (
                <button onClick={getAISuggestions} disabled={aiLoading} className="btn-primary">
                  {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</> : <><Sparkles className="w-4 h-4" /> Get AI Suggestions</>}
                </button>
              )}
            </div>

            {suggestions && (
              <>
                <div className="card p-6 space-y-5">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-5 h-5" />
                    <h3>AI Recommendations</h3>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Suggested Roles</h4>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.suggestedRoles.map((r) => (
                        <span key={r} className="badge bg-blue-50 text-blue-700">{r}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Department Structure</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {suggestions.departmentStructure.map((dept) => (
                        <div key={dept.name} className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-800">{dept.name}</p>
                          <p className="text-xs text-gray-500 mt-1">{dept.roles.join(', ')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Hiring Priorities</h4>
                    <ol className="space-y-1">
                      {suggestions.hiringPriorities.map((p, i) => (
                        <li key={p} className="text-sm text-gray-600 flex gap-2">
                          <span className="text-blue-600 font-medium">{i + 1}.</span> {p}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">HR Insight</span>
                    </div>
                    <p className="text-sm text-blue-700">{suggestions.insights}</p>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <input type="checkbox" id="approve" checked={approvedSuggestions}
                      onChange={(e) => setApprovedSuggestions(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                    <label htmlFor="approve" className="text-sm text-gray-700">
                      I have reviewed the AI suggestions and approve them for my company setup
                    </label>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button className="btn-secondary" onClick={() => setStep(2)}>← Back</button>
                  <button className="btn-primary" onClick={handleComplete} disabled={loading || !approvedSuggestions}>
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Complete Setup →'}
                  </button>
                </div>
              </>
            )}

            {!suggestions && (
              <div className="flex justify-between">
                <button className="btn-secondary" onClick={() => setStep(2)}>← Back</button>
                <button className="btn-primary" onClick={handleComplete} disabled={loading}>
                  {loading ? 'Saving…' : 'Skip & Complete →'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
