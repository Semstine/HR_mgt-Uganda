import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { createAuditEvent } from '@/lib/dsc-workflow'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(req.url)
    const districtId = searchParams.get('districtId') || session.user.districtId

    const panels = await withRetry(() =>
      prisma.shortlistingPanel.findMany({
        where: { recruitmentCycle: { ...(districtId ? { districtId } : {}) } },
        include: {
          recruitmentCycle: { select: { id: true, postRef: true, postTitle: true, grade: true, department: true, districtId: true } },
          panelMembers: true,
          scores: { select: { id: true, applicationId: true, scorerId: true, overallResult: true, isSubmitted: true } },
          decisions: {
            include: { application: { select: { id: true, firstName: true, lastName: true, applicationRef: true } } },
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

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()
    if (!['SECRETARY_DSC', 'NATIONAL_ADMIN_MOPS', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await req.json()

    const existing = await withRetry(() =>
      prisma.shortlistingPanel.findUnique({ where: { recruitmentCycleId: body.cycleId } })
    )
    if (existing) return NextResponse.json({ error: 'A panel already exists for this cycle' }, { status: 409 })

    const panel = await withRetry(() =>
      prisma.shortlistingPanel.create({
        data: {
          recruitmentCycleId: body.cycleId,
          createdBy: session.user.id,
          status: 'open',
          panelMembers: {
            create: (body.memberIds as string[]).map((memberId: string, i: number) => ({
              memberId,
              memberRole: i === 0 ? 'dsc_chairperson' : i === 1 ? 'secretary' : 'dsc_member',
            })),
          },
        },
        include: { panelMembers: true },
      })
    )

    await createAuditEvent({
      entityType: 'ShortlistingPanel',
      entityId: panel.id,
      action: 'SHORTLISTING_PANEL_CONSTITUTED',
      actorId: session.user.id,
      metadata: { cycleId: body.cycleId, memberCount: body.memberIds?.length },
    })

    return NextResponse.json({ data: panel }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
