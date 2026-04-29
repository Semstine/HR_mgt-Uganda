import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { status, reason } = await req.json()
  if (!status) return NextResponse.json({ error: 'Status required' }, { status: 400 })

  const candidate = await prisma.candidate.findUnique({
    where: { id: params.id },
    include: { job: { select: { companyId: true } } },
  })

  if (!candidate || candidate.job.companyId !== session.user.companyId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const [updated] = await prisma.$transaction([
    prisma.candidate.update({ where: { id: params.id }, data: { status } }),
    prisma.candidateStatusHistory.create({
      data: {
        candidateId: params.id,
        fromStatus: candidate.status,
        toStatus: status,
        reason,
        changedBy: session.user.name,
      },
    }),
  ])

  return NextResponse.json({ candidate: updated })
}
