import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail, buildEmailHtml } from '@/lib/email'

// POST /api/communications/[id]/approve — approve a draft and optionally send immediately
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sendNow = false } = await req.json().catch(() => ({}))

  const comm = await prisma.candidateComm.findUnique({
    where: { id: params.id },
    include: {
      candidate: {
        include: { job: { include: { company: true } } },
      },
    },
  })

  if (!comm) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (comm.candidate.job.companyId !== session.user.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const updated = await prisma.candidateComm.update({
    where: { id: params.id },
    data: {
      status: sendNow ? 'sent' : 'approved',
      approvedBy: session.user.name,
      approvedAt: new Date(),
      ...(sendNow ? { sentBy: session.user.name, sentAt: new Date() } : {}),
    },
  })

  if (sendNow) {
    try {
      await sendEmail({
        to: comm.candidate.email,
        subject: comm.subject,
        html: buildEmailHtml(comm.body, comm.candidate.job.company.name),
      })
    } catch {
      await prisma.candidateComm.update({
        where: { id: params.id },
        data: { status: 'failed', failReason: 'SMTP delivery failed' },
      })
      return NextResponse.json({ error: 'Email approved but delivery failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ comm: updated })
}
