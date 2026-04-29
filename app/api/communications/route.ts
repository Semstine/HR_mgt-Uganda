import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateEmailTemplate } from '@/lib/ai'
import { sendEmail, buildEmailHtml } from '@/lib/email'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { candidateId, type, send = false } = await req.json()

  const [candidate, company] = await Promise.all([
    prisma.candidate.findUnique({ where: { id: candidateId }, include: { job: { select: { title: true } } } }),
    prisma.company.findUnique({ where: { id: session.user.companyId }, select: { name: true } }),
  ])

  if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

  try {
    const template = await generateEmailTemplate({
      type,
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      jobTitle: candidate.job.title,
      companyName: company?.name || 'Our Company',
    })

    const comm = await prisma.candidateComm.create({
      data: {
        candidateId,
        subject: template.subject,
        body: template.body,
        type: 'email',
        sentBy: session.user.name,
        approved: !send,
      },
    })

    if (send) {
      await sendEmail({
        to: candidate.email,
        subject: template.subject,
        html: buildEmailHtml(template.body, company?.name),
      })
      await prisma.candidateComm.update({ where: { id: comm.id }, data: { sentAt: new Date(), approved: true } })
    }

    return NextResponse.json({ comm: { ...comm, subject: template.subject, body: template.body } })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Email generation failed' }, { status: 500 })
  }
}
