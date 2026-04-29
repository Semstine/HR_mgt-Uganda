import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const candidate = await prisma.candidate.findUnique({
    where: { id: params.id },
    include: {
      job: { select: { id: true, title: true, location: true, salaryMin: true, salaryMax: true, currency: true, interviewQuestions: true, companyId: true } },
      interviews: { orderBy: { scheduledAt: 'desc' } },
      statusHistory: { orderBy: { createdAt: 'desc' } },
      communications: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!candidate || candidate.job.companyId !== session.user.companyId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ candidate })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const candidate = await prisma.candidate.update({ where: { id: params.id }, data: body })
  return NextResponse.json({ candidate })
}
