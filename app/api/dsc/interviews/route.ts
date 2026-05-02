import { NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { createAuditEvent } from '@/lib/dsc-workflow'

export async function GET(req: Request) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(req.url)
    const recruitmentCycleId = searchParams.get('cycleId')

    const panels = await withRetry(() =>
      prisma.interviewPanel.findMany({
        where: { ...(recruitmentCycleId ? { recruitmentCycleId } : {}) },
        include: {
          recruitmentCycle: { include: { vacancyDeclaration: { include: { department: true } } } },
          panelMembers: true,
          schedules: {
            include: { application: { select: { id: true, applicationRef: true, lastName: true, firstName: true } } },
          },
          scores: {
            where: session.user.role === 'DSC_MEMBER' ? { scorerId: session.user.id } : {},
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    )
    return NextResponse.json({ data: panels })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth()
    if (!['SECRETARY_DSC', 'DSC_CHAIRPERSON', 'NATIONAL_ADMIN_MOPS', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await req.json()
    const panel = await withRetry(() =>
      prisma.interviewPanel.create({
        data: {
          recruitmentCycleId: body.recruitmentCycleId,
          createdBy: session.user.id,
          panelMembers: {
            create: (body.memberIds as string[]).map((memberId: string) => ({
              memberId,
              memberRole: body.memberRoles?.[memberId] || 'dsc_member',
            })),
          },
        },
        include: { panelMembers: true },
      })
    )
    await createAuditEvent({
      entityType: 'InterviewPanel',
      entityId: panel.id,
      action: 'INTERVIEW_PANEL_CONSTITUTED',
      actorId: session.user.id,
      metadata: { recruitmentCycleId: body.recruitmentCycleId },
    })
    return NextResponse.json({ data: panel }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
