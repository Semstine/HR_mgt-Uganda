import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail, buildEmailHtml } from '@/lib/email'

// POST /api/offers/[id]/approve — HR approves and sends offer to candidate
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await req.json() // action: 'approve' | 'reject'

  const offer = await prisma.offer.findUnique({
    where: { id: params.id },
    include: {
      candidate: { include: { job: { include: { company: true } } } },
    },
  })

  if (!offer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (offer.candidate.job.companyId !== session.user.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  if (action === 'reject') {
    const updated = await prisma.offer.update({
      where: { id: params.id },
      data: { hrApprovalStatus: 'rejected', hrApprovedBy: session.user.name, hrApprovedAt: new Date() },
    })
    return NextResponse.json({ offer: updated })
  }

  // Approve and send signing link to candidate
  const signingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/sign/${offer.signatureToken}`
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const updated = await prisma.offer.update({
    where: { id: params.id },
    data: {
      hrApprovalStatus: 'approved',
      hrApprovedBy: session.user.name,
      hrApprovedAt: new Date(),
      status: 'sent',
      sentAt: new Date(),
      expiresAt,
    },
  })

  try {
    const { firstName, lastName } = offer.candidate
    await sendEmail({
      to: offer.candidate.email,
      subject: `Your Offer Letter — ${offer.role} at ${offer.candidate.job.company.name}`,
      html: buildEmailHtml(
        `Dear ${firstName} ${lastName},\n\nWe are pleased to offer you the position of ${offer.role}.\n\nPlease review and sign your offer letter using the link below:\n\n${signingUrl}\n\nThis link expires in 7 days.\n\nCongratulations and welcome to the team!`,
        offer.candidate.job.company.name,
      ),
    })
  } catch {
    // Log but don't fail — offer is approved, email can be resent
  }

  return NextResponse.json({ offer: updated, signingUrl })
}
