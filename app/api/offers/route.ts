import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateOfferLetter } from '@/lib/pdf'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { v4 as uuid } from 'uuid'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { candidateId, role, salary, currency = 'UGX', startDate, probationMonths = 3, supervisor, workLocation, benefits, terms } = body

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
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'offers')
  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, fileName), pdfBytes)
  const letterUrl = `/uploads/offers/${fileName}`

  const offer = await prisma.offer.upsert({
    where: { candidateId },
    create: { candidateId, role, salary, currency, startDate: new Date(startDate), probationMonths, supervisor, workLocation, benefits, terms, letterUrl, status: 'draft' },
    update: { role, salary, currency, startDate: new Date(startDate), probationMonths, supervisor, workLocation, benefits, terms, letterUrl },
  })

  return NextResponse.json({ offer, letterUrl })
}
