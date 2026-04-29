import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail, buildEmailHtml } from '@/lib/email'

// POST /api/communications/[id]/send — send an approved email
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const comm = await prisma.candidateComm.findUnique({
    where: { id: params.id },
    include: {
      candidate: { include: { job: { include: { company: true } } } },
    },
  })

  if (!comm) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (comm.candidate.job.companyId !== session.user.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  if (comm.status !== 'approved') {
    return NextResponse.json({ error: 'Email must be approved before sending' }, { status: 400 })
  }

  try {
    await sendEmail({
      to: comm.candidate.email,
      subject: comm.subject,
      html: buildEmailHtml(comm.body, comm.candidate.job.company.name),
    })

    const updated = await prisma.candidateComm.update({
      where: { id: params.id },
      data: { status: 'sent', sentBy: session.user.name, sentAt: new Date() },
    })

    return NextResponse.json({ comm: updated })
  } catch {
    await prisma.candidateComm.update({
      where: { id: params.id },
      data: { status: 'failed', failReason: 'SMTP delivery failed' },
    })
    return NextResponse.json({ error: 'Email delivery failed' }, { status: 500 })
  }
}
