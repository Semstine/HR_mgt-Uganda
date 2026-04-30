import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { assignOnboardingPath } from '@/lib/onboarding'

// GET — fetch offer details by token (public, no auth)
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const offer = await prisma.offer.findUnique({
    where: { signatureToken: params.token },
    include: {
      candidate: {
        select: { firstName: true, lastName: true, email: true },
      },
    },
  })

  if (!offer) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
  if (offer.expiresAt && offer.expiresAt < new Date()) {
    return NextResponse.json({ error: 'This offer link has expired' }, { status: 410 })
  }
  if (offer.status === 'signed') {
    return NextResponse.json({ error: 'This offer has already been signed' }, { status: 409 })
  }

  return NextResponse.json({
    offer: {
      id: offer.id,
      role: offer.role,
      salary: offer.salary,
      currency: offer.currency,
      startDate: offer.startDate,
      probationMonths: offer.probationMonths,
      workLocation: offer.workLocation,
      benefits: offer.benefits,
      terms: offer.terms,
      letterUrl: offer.letterUrl,
      expiresAt: offer.expiresAt,
      candidateName: `${offer.candidate.firstName} ${offer.candidate.lastName}`,
    },
  })
}

// POST — submit candidate signature
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const offer = await prisma.offer.findUnique({
    where: { signatureToken: params.token },
    include: { candidate: { select: { firstName: true, lastName: true } } },
  })

  if (!offer) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })
  if (offer.expiresAt && offer.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Offer link has expired' }, { status: 410 })
  }
  if (offer.status === 'signed') {
    return NextResponse.json({ error: 'Already signed' }, { status: 409 })
  }

  const body = await req.json()
  const { signedByName, signatureData, action } = body

  if (action === 'decline') {
    await prisma.offer.update({
      where: { id: offer.id },
      data: { status: 'declined' },
    })
    // Update candidate status
    await prisma.candidate.update({
      where: { id: offer.candidateId },
      data: { status: 'ARCHIVED' },
    })
    return NextResponse.json({ message: 'Offer declined' })
  }

  if (!signedByName) return NextResponse.json({ error: 'Name required to sign' }, { status: 400 })

  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  const userAgent = req.headers.get('user-agent') || 'unknown'

  await prisma.offer.update({
    where: { id: offer.id },
    data: {
      status: 'signed',
      signedAt: new Date(),
      signedByName,
      signatureData: signatureData || null,
      signatureIp: ip,
      signatureDevice: userAgent.substring(0, 255),
    },
  })

  await prisma.candidate.update({
    where: { id: offer.candidateId },
    data: { status: 'OFFER_ACCEPTED' },
  })

  await prisma.candidateStatusHistory.create({
    data: {
      candidateId: offer.candidateId,
      fromStatus: 'OFFER_SENT',
      toStatus: 'OFFER_ACCEPTED',
      reason: 'Offer signed digitally',
      changedBy: signedByName,
    },
  })

  // Auto-assign onboarding path if an employee record exists for this candidate
  try {
    const employee = await prisma.employee.findUnique({
      where: { candidateId: offer.candidateId },
      include: { department: true },
    })
    if (employee) {
      await assignOnboardingPath(employee.id, employee.companyId, {
        department: employee.department?.name,
        jobTitle: employee.jobTitle,
        employmentType: employee.employmentType,
        startDate: offer.startDate,
      })
    }
  } catch {
    // Non-fatal: onboarding can be assigned manually from HR dashboard
  }

  return NextResponse.json({ message: 'Offer signed successfully' })
}
