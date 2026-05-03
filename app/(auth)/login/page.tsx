'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await signIn('credentials', {
      email: form.email,
      password: form.password,
      redirect: false,
    })
    setLoading(false)
    if (res?.error) {
      setError('Invalid credentials. Please check your email and password.')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <>
      {/* Header */}
      <div className="mb-7">
        <h2 className="text-xl font-bold text-gray-900">Sign in to DSC-HRMS</h2>
        <p className="text-sm text-gray-500 mt-1">Enter your official government credentials</p>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="label">Official Email Address</label>
          <input
            type="email"
            className="input"
            placeholder="officer@district.go.ug"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
            required
          />
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label mb-0">Password</label>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className="input pr-10"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn-primary w-full justify-center py-2.5 mt-2"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      {/* Register link */}
      <p className="text-center text-sm text-gray-500 mt-6">
        New district?{' '}
        <Link href="/register" className="text-blue-600 font-semibold hover:text-blue-700">
          Register your DSC
        </Link>
      </p>

      {/* Demo credentials */}
      <div className="mt-6 p-4 bg-slate-100 rounded-xl border border-slate-200">
        <p className="text-xs font-bold text-slate-600 mb-2">Demo Credentials · password: <code className="font-mono">demo1234</code></p>
        <div className="space-y-1">
          {[
            'chairperson.wakiso@dsc.go.ug',
            'secretary.wakiso@dsc.go.ug',
            'mops.admin@gov.ug',
          ].map(email => (
            <button
              key={email}
              type="button"
              onClick={() => setForm({ email, password: 'demo1234' })}
              className="block w-full text-left text-xs text-blue-700 hover:text-blue-900 font-mono py-0.5 hover:underline"
            >
              {email}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
