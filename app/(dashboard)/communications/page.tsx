import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/header'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { EMAIL_COMM_STATUS_COLORS, EMAIL_COMM_STATUS_LABELS } from '@/types'
import type { EmailCommStatus } from '@/types'
import { Mail, Clock, CheckCircle, Send } from 'lucide-react'

export default async function CommunicationsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const comms = await prisma.candidateComm.findMany({
    where: { candidate: { job: { companyId: session.user.companyId! } } },
    include: {
      candidate: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          job: { select: { title: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const stats = {
    draft: comms.filter((c) => c.status === 'draft').length,
    pending: comms.filter((c) => c.status === 'pending_approval').length,
    sent: comms.filter((c) => c.status === 'sent').length,
    failed: comms.filter((c) => c.status === 'failed').length,
  }

  return (
    <main className="flex-1">
      <Header title="Communications" subtitle="Review and approve candidate emails before sending" />
      <div className="p-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Drafts', value: stats.draft, icon: Mail, color: 'bg-gray-50 border-gray-200 text-gray-600' },
            { label: 'Pending Approval', value: stats.pending, icon: Clock, color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
            { label: 'Sent', value: stats.sent, icon: Send, color: 'bg-blue-50 border-blue-200 text-blue-700' },
            { label: 'Failed', value: stats.failed, icon: CheckCircle, color: 'bg-red-50 border-red-200 text-red-700' },
          ].map((s) => (
            <div key={s.label} className={`card p-4 border ${s.color}`}>
              <div className="flex items-center gap-2 mb-1">
                <s.icon className="w-4 h-4" />
                <p className="text-sm">{s.label}</p>
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Pending approval banner */}
        {stats.pending > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <p className="text-sm text-yellow-800">
              <strong>{stats.pending} email{stats.pending > 1 ? 's' : ''}</strong> waiting for your approval before they can be sent.
            </p>
          </div>
        )}

        {/* Email list */}
        <div className="space-y-3">
          {comms.length === 0 ? (
            <div className="card p-12 text-center">
              <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No communications yet</p>
              <p className="text-sm text-gray-400 mt-1">Generate emails from candidate profiles to get started</p>
            </div>
          ) : (
            comms.map((comm) => (
              <div key={comm.id} className="card p-4 flex items-start gap-4">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{comm.subject}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        To: {comm.candidate.firstName} {comm.candidate.lastName} · {comm.candidate.job.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{comm.body.substring(0, 120)}...</p>
                    </div>
                    <span className={`badge text-xs flex-shrink-0 ${EMAIL_COMM_STATUS_COLORS[comm.status as EmailCommStatus]}`}>
                      {EMAIL_COMM_STATUS_LABELS[comm.status as EmailCommStatus] ?? comm.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-xs text-gray-400">{formatDate(comm.createdAt)}</span>
                    {comm.sentAt && <span className="text-xs text-gray-400">Sent {formatDate(comm.sentAt)}</span>}
                    {(comm.status === 'draft' || comm.status === 'pending_approval') && (
                      <CommActions commId={comm.id} status={comm.status} candidateEmail={comm.candidate.email} />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  )
}

function CommActions({ commId, status, candidateEmail }: { commId: string; status: string; candidateEmail: string }) {
  return (
    <div className="flex gap-2">
      {status === 'draft' && (
        <form action={`/api/communications/${commId}/approve`} method="POST">
          <button
            type="submit"
            className="text-xs text-blue-600 hover:underline"
            formAction={`/api/communications/${commId}/approve`}
          >
            Submit for Approval
          </button>
        </form>
      )}
      {status === 'pending_approval' && (
        <>
          <Link href={`/api/communications/${commId}/approve`} className="text-xs text-green-600 hover:underline">
            Approve & Send
          </Link>
        </>
      )}
    </div>
  )
}
