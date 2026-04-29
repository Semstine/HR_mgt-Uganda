import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateOfferLetter } from '@/lib/pdf'
import { uploadFile } from '@/lib/storage'
import { v4 as uuid } from 'uuid'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    candidateId, role, salary, currency = 'UGX', startDate,
    probationMonths = 3, supervisor, workLocation, benefits, terms,
  } = body

  const [candidate, company] = await Promise.all([
    prisma.candidate.findUnique({ where: { id: candidateId }, select: { firstName: true, lastName: true } }),
    prisma.company.findUnique({ where: { id: session.user.companyId }, select: { name: true } }),
  ])

  if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

  const pdfBytes = await generateOfferLetter({
    candidateName: `${candidate.firstName} ${candidate.lastName}`,
    role,
    salary,
    currency,
    startDate: new Date(startDate).toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' }),
    probationMonths,
    supervisor,
    workLocation,
    benefits,
    companyName: company?.name || 'Company',
  })

  const fileName = `offer-${candidateId}-${uuid().slice(0, 8)}.pdf`
  const { storageKey } = await uploadFile(Buffer.from(pdfBytes), fileName, 'offers')

  // Generate a unique signing token
  const signatureToken = uuid()

  const offer = await prisma.offer.upsert({
    where: { candidateId },
    create: {
      candidateId, role, salary, currency,
      startDate: new Date(startDate),
      probationMonths, supervisor, workLocation, benefits, terms,
      letterUrl: `/api/files/${storageKey}`,
      status: 'draft',
      signatureToken,
      hrApprovalStatus: 'pending',
    },
    update: {
      role, salary, currency,
      startDate: new Date(startDate),
      probationMonths, supervisor, workLocation, benefits, terms,
      letterUrl: `/api/files/${storageKey}`,
      signatureToken,
    },
  })

  return NextResponse.json({ offer, letterUrl: offer.letterUrl })
}
