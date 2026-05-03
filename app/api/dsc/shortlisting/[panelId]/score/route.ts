import { NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { requireAuth, canScore } from '@/lib/auth'
import { createAuditEvent } from '@/lib/dsc-workflow'

export async function POST(req: Request, { params }: { params: { panelId: string } }) {
  try {
    const session = await requireAuth()
    if (!canScore(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden — only panel scorers can submit scores' }, { status: 403 })
    }

    const panel = await withRetry(() =>
      prisma.shortlistingPanel.findUnique({ where: { id: params.panelId } })
    )
    if (!panel) return NextResponse.json({ error: 'Panel not found' }, { status: 404 })
    if (panel.lockedAt !== null) return NextResponse.json({ error: 'Panel is locked — no more scores accepted' }, { status: 400 })

    const body = await req.json()

    const score = await withRetry(() =>
      prisma.shortlistingScore.upsert({
        where: {
          panelId_applicationId_scorerId: {
            panelId: params.panelId,
            applicationId: body.applicationId,
            scorerId: session.user.id,
          },
        },
        update: {
          scores: body.scores,
          overallResult: body.overallResult,
          notes: body.notes,
          isSubmitted: Boolean(body.submit),
          submittedAt: body.submit ? new Date() : null,
        },
        create: {
          panelId: params.panelId,
          applicationId: body.applicationId,
          scorerId: session.user.id,
          scores: body.scores ?? {},
          overallResult: body.overallResult,
          notes: body.notes,
          isSubmitted: Boolean(body.submit),
          submittedAt: body.submit ? new Date() : null,
        },
      })
    )

    await createAuditEvent({
      entityType: 'ShortlistingScore',
      entityId: score.id,
      action: 'SHORTLISTING_SCORE_SUBMITTED',
      actorId: session.user.id,
      metadata: { panelId: params.panelId, applicationId: body.applicationId },
    })

    return NextResponse.json({ data: score })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
