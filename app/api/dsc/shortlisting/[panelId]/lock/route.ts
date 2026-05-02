import { NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { createAuditEvent } from '@/lib/dsc-workflow'

export async function POST(_: Request, { params }: { params: { panelId: string } }) {
  try {
    const session = await requireAuth()
    if (!['DSC_CHAIRPERSON', 'SECRETARY_DSC', 'NATIONAL_ADMIN_MOPS', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden — only Chairperson can lock the panel' }, { status: 403 })
    }

    const panel = await withRetry(() =>
      prisma.shortlistingPanel.findUnique({
        where: { id: params.panelId },
        include: {
          scores: true,
          cycle: { include: { applications: { select: { id: true } } } },
        },
      })
    )
    if (!panel) return NextResponse.json({ error: 'Panel not found' }, { status: 404 })
    if (panel.isLocked) return NextResponse.json({ error: 'Already locked' }, { status: 400 })

    // Calculate average scores and create decisions
    const appIds = panel.cycle.applications.map((a) => a.id)
    const threshold = 50 // default pass mark

    await withRetry(async () => {
      for (const appId of appIds) {
        const appScores = panel.scores.filter((s) => s.applicationId === appId)
        if (appScores.length === 0) continue
        const avg = appScores.reduce((sum, s) => sum + s.totalScore, 0) / appScores.length
        await prisma.shortlistDecision.create({
          data: {
            panelId: params.panelId,
            applicationId: appId,
            averageScore: avg,
            status: avg >= threshold ? 'shortlisted' : 'not_shortlisted',
          },
        })
        await prisma.pSCForm3Application.update({
          where: { id: appId },
          data: { status: avg >= threshold ? 'shortlisted' : 'rejected' },
        })
      }
    })

    const locked = await withRetry(() =>
      prisma.shortlistingPanel.update({
        where: { id: params.panelId },
        data: { isLocked: true, lockedAt: new Date(), lockedById: session.user.id },
      })
    )

    await createAuditEvent({
      entityType: 'ShortlistingPanel',
      entityId: params.panelId,
      action: 'SHORTLISTING_PANEL_LOCKED',
      actorId: session.user.id,
      metadata: { shortlistedCount: appIds.length },
    })

    return NextResponse.json({ data: locked })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
