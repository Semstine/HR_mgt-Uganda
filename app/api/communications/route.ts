import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateEmailTemplate } from '@/lib/ai'
import type { EmailTemplateType } from '@/lib/ai'

// GET /api/communications?status=pending_approval&candidateId=xxx
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const candidateId = searchParams.get('candidateId')

  const comms = await prisma.candidateComm.findMany({
    where: {
      candidate: { job: { companyId: session.user.companyId } },
      ...(status ? { status } : {}),
      ...(candidateId ? { candidateId } : {}),
    },
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
  })

  return NextResponse.json({ comms })
}

// POST /api/communications — create draft (optionally AI-generated)
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { candidateId, type, subject, body: bodyText, generateAI, additionalContext } = body

  if (!candidateId) return NextResponse.json({ error: 'candidateId required' }, { status: 400 })

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { job: { include: { company: true } } },
  })
  if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

  let finalSubject = subject
  let finalBody = bodyText

  if (generateAI && type) {
    const template = await generateEmailTemplate({
      type: type as EmailTemplateType,
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      jobTitle: candidate.job.title,
      companyName: candidate.job.company.name,
      additionalContext,
    })
    finalSubject = template.subject
    finalBody = template.body
  }

  if (!finalSubject || !finalBody) {
    return NextResponse.json({ error: 'subject and body are required' }, { status: 400 })
  }

  const comm = await prisma.candidateComm.create({
    data: {
      candidateId,
      subject: finalSubject,
      body: finalBody,
      type: 'email',
      template: type || null,
      status: 'draft',
    },
  })

  return NextResponse.json({ comm }, { status: 201 })
}
