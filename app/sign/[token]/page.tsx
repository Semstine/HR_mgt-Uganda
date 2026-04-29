'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { CheckCircle, XCircle, FileText, Loader } from 'lucide-react'

interface OfferDetails {
  id: string
  role: string
  salary: number
  currency: string
  startDate: string
  probationMonths: number
  workLocation: string | null
  benefits: string | null
  terms: string | null
  letterUrl: string | null
  expiresAt: string | null
  candidateName: string
}

export default function SignOfferPage() {
  const { token } = useParams<{ token: string }>()
  const [offer, setOffer] = useState<OfferDetails | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [signedName, setSignedName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<'signed' | 'declined' | null>(null)

  useEffect(() => {
    fetch(`/api/offers/sign/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setOffer(d.offer)
      })
      .finally(() => setLoading(false))
  }, [token])

  async function handleSign(action: 'sign' | 'decline') {
    if (action === 'sign' && !signedName.trim()) {
      alert('Please type your full name to sign')
      return
    }
    if (action === 'sign' && !agreed) {
      alert('Please confirm you have read the offer')
      return
    }
    setSubmitting(true)
    const res = await fetch(`/api/offers/sign/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action === 'decline' ? { action: 'decline' } : { signedByName: signedName }),
    })
    const data = await res.json()
    if (res.ok) setDone(action === 'sign' ? 'signed' : 'declined')
    else setError(data.error || 'Something went wrong')
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link Unavailable</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (done === 'signed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Offer Signed!</h1>
          <p className="text-gray-600">Congratulations, {offer?.candidateName}. Your offer has been signed and the HR team has been notified. We look forward to welcoming you.</p>
        </div>
      </div>
    )
  }

  if (done === 'declined') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">
          <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Offer Declined</h1>
          <p className="text-gray-500">We have recorded your decision. Thank you for your time.</p>
        </div>
      </div>
    )
  }

  if (!offer) return null

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow p-6 text-center">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Your Offer Letter</h1>
          <p className="text-gray-500 mt-1">Hi {offer.candidateName}, please review and sign your offer below.</p>
          {offer.expiresAt && (
            <p className="text-sm text-orange-600 mt-2">Expires: {formatDate(new Date(offer.expiresAt))}</p>
          )}
        </div>

        {/* Offer details */}
        <div className="bg-white rounded-2xl shadow p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-lg">Offer Summary</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Role', value: offer.role },
              { label: 'Salary', value: `${offer.currency} ${offer.salary.toLocaleString()} / month` },
              { label: 'Start Date', value: formatDate(new Date(offer.startDate)) },
              { label: 'Probation', value: `${offer.probationMonths} months` },
              { label: 'Work Location', value: offer.workLocation || 'As agreed' },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-gray-400 text-xs">{item.label}</p>
                <p className="font-medium text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>

          {offer.benefits && (
            <div>
              <p className="text-gray-400 text-xs mb-1">Benefits</p>
              <p className="text-sm text-gray-700">{offer.benefits}</p>
            </div>
          )}

          {offer.terms && (
            <div>
              <p className="text-gray-400 text-xs mb-1">Terms & Conditions</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{offer.terms}</p>
            </div>
          )}

          {offer.letterUrl && (
            <a
              href={offer.letterUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:underline text-sm"
            >
              <FileText className="w-4 h-4" /> Download full offer letter (PDF)
            </a>
          )}
        </div>

        {/* Signature */}
        <div className="bg-white rounded-2xl shadow p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-lg">Sign your offer</h2>
          <p className="text-sm text-gray-500">Type your full legal name below to digitally sign. By signing you confirm your acceptance of this offer.</p>

          <input
            type="text"
            className="input w-full"
            placeholder="Type your full name"
            value={signedName}
            onChange={(e) => setSignedName(e.target.value)}
          />

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span className="text-sm text-gray-600">
              I have read and understood the offer letter and agree to its terms and conditions.
            </span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => handleSign('sign')}
              disabled={submitting}
              className="btn-primary flex-1"
            >
              {submitting ? 'Signing...' : 'Accept & Sign Offer'}
            </button>
            <button
              onClick={() => handleSign('decline')}
              disabled={submitting}
              className="btn-secondary"
            >
              Decline
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Your signature will be recorded with timestamp and IP address for audit purposes.
          </p>
        </div>
      </div>
    </div>
  )
}
