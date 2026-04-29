'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    companyName: '',
    industry: '',
    size: '',
    location: '',
    adminName: '',
    adminEmail: '',
    password: '',
    confirmPassword: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step < 2) { setStep(2); return }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')
      router.push('/login?registered=1')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const industries = ['Technology', 'Finance & Banking', 'Healthcare', 'Education', 'Manufacturing', 'Retail', 'Agriculture', 'NGO / Non-profit', 'Government', 'Hospitality', 'Construction', 'Logistics', 'Media & Communications', 'Other']
  const sizes = ['1-10 employees', '11-50 employees', '51-200 employees', '201-500 employees', '500+ employees']

  return (
    <>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Create your account</h2>
      <p className="text-sm text-gray-500 mb-6">
        Step {step} of 2 — {step === 1 ? 'Company information' : 'Admin account'}
      </p>

      <div className="flex gap-2 mb-6">
        {[1, 2].map((s) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {step === 1 && (
          <>
            <div>
              <label className="label">Company name *</label>
              <input className="input" placeholder="Acme Uganda Ltd" value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })} required />
            </div>
            <div>
              <label className="label">Industry *</label>
              <select className="select" value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })} required>
                <option value="">Select industry</option>
                {industries.map((i) => <option key={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Company size *</label>
              <select className="select" value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })} required>
                <option value="">Select size</option>
                {sizes.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Location *</label>
              <input className="input" placeholder="Kampala, Uganda" value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })} required />
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <div>
              <label className="label">Your full name *</label>
              <input className="input" placeholder="Jane Nakato" value={form.adminName}
                onChange={(e) => setForm({ ...form, adminName: e.target.value })} required />
            </div>
            <div>
              <label className="label">Work email *</label>
              <input type="email" className="input" placeholder="jane@company.co.ug" value={form.adminEmail}
                onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} required />
            </div>
            <div>
              <label className="label">Password *</label>
              <input type="password" className="input" placeholder="Min. 8 characters" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
            </div>
            <div>
              <label className="label">Confirm password *</label>
              <input type="password" className="input" placeholder="Repeat password" value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required />
            </div>
          </>
        )}
        <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading}>
          {loading ? 'Creating account…' : step === 1 ? 'Continue →' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
      </p>
    </>
  )
}
