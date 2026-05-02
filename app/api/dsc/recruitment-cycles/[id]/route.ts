import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireDscApi } from '@/lib/dsc-rbac'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const cycle = await prisma.recruitmentCycle.findUnique({
    where: { id: params.id },
    include: {
      district: true,
      establishmentNotice: true,
      vacancyDeclaration: true,
      advert: { include: { publicationLogs: true } },
      applications: { orderBy: { submittedAt: 'desc' } },
      shortlistingPanel: { include: { panelMembers: true, decisions: true, scores: true } },
      interviewPanel: { include: { panelMembers: true, schedules: true, scores: true, writtenTests: true } },
      dscMinutes: true,
      appointmentDecisions: true,
      workflowSteps: { orderBy: { stepNumber: 'asc' } },
      auditEvents: { orderBy: { timestamp: 'desc' }, take: 20 },
    },
  })

  if (!cycle) return NextResponse.json({ error: 'Recruitment cycle not found' }, { status: 404 })
  const auth = await requireDscApi(req, [], cycle.districtId)
  if ('error' in auth) return auth.error

  return NextResponse.json({ cycle })
}
