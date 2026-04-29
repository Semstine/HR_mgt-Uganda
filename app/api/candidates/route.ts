import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const jobId = searchParams.get('jobId')
  const q = searchParams.get('q')

  const candidates = await prisma.candidate.findMany({
    where: {
      job: { companyId: session.user.companyId },
      ...(status ? { status: status as never } : {}),
      ...(jobId ? { jobId } : {}),
      ...(q ? {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      } : {}),
    },
    orderBy: { applicationDate: 'desc' },
    include: { job: { select: { title: true } } },
  })

  return NextResponse.json({ candidates })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { jobId, firstName, lastName, email, phone, location, linkedIn, resumeUrl, source } = body

  if (!jobId || !firstName || !lastName || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const job = await prisma.job.findUnique({ where: { id: jobId } })
  if (!job || job.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Job not found or not active' }, { status: 404 })
  }

  const candidate = await prisma.candidate.create({
    data: {
      jobId, firstName, lastName, email, phone, location, linkedIn, resumeUrl, source,
    },
  })

  await prisma.candidateStatusHistory.create({
    data: { candidateId: candidate.id, toStatus: 'RECEIVED' },
  })

  return NextResponse.json({ candidate }, { status: 201 })
}
