import { NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { requireAuth, canScore } from '@/lib/auth'
import { createAuditEvent } from '@/lib/dsc-workflow'

export async function POST(req: Request, { params }: { params: { panelId: string } }) {
  try {
    const session = await requireAuth()
    if (!canScore(session.user.role as any)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await req.json()

    const score = await withRetry(() =>
      prisma.interviewScore.upsert({
        where: {
          panelId_applicationId_scorerId: {
            panelId: params.panelId,
            applicationId: body.applicationId,
            scorerId: session.user.id,
          },
        },
        update: {
          scores: body.scores,
          totalScore: body.totalScore,
          recommendation: body.recommendation,
          notes: body.notes,
          isSubmitted: Boolean(body.submit),
          submittedAt: body.submit ? new Date() : null,
        },
        create: {
          panelId: params.panelId,
          applicationId: body.applicationId,
          scorerId: session.user.id,
          scores: body.scores,
          totalScore: body.totalScore,
          recommendation: body.recommendation || 'reserve',
          notes: body.notes,
          isSubmitted: Boolean(body.submit),
          submittedAt: body.submit ? new Date() : null,
        },
      })
    )

    await createAuditEvent({
      entityType: 'InterviewScore',
      entityId: score.id,
      action: 'INTERVIEW_SCORE_SUBMITTED',
      actorId: session.user.id,
      metadata: { panelId: params.panelId, applicationId: body.applicationId, total: body.totalScore },
    })

    return NextResponse.json({ data: score })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
