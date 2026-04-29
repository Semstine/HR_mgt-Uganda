import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { scheduledAt, type, interviewers, location, meetingLink } = await req.json()

  const interview = await prisma.interview.create({
    data: {
      candidateId: params.id,
      scheduledAt: new Date(scheduledAt),
      type: type || 'in-person',
      interviewers: interviewers || [],
      location,
      meetingLink,
    },
  })

  await prisma.candidate.update({
    where: { id: params.id },
    data: { status: 'INTERVIEW_SCHEDULED' },
  })

  return NextResponse.json({ interview }, { status: 201 })
}
