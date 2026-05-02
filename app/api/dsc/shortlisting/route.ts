import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireDscApi } from '@/lib/dsc-rbac'
import { createImmutableAuditEvent } from '@/lib/dsc-workflow'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const panel = await prisma.shortlistingPanel.findUnique({
    where: { id: body.panelId },
    include: { recruitmentCycle: true },
  })

  if (!panel) return NextResponse.json({ error: 'Shortlisting panel not found' }, { status: 404 })
  const auth = await requireDscApi(req, ['SCORE_SHORTLIST'], panel.recruitmentCycle.districtId)
  if ('error' in auth) return auth.error

  const score = await prisma.shortlistingScore.upsert({
    where: { panelId_applicationId_scorerId: { panelId: panel.id, applicationId: body.applicationId, scorerId: auth.context.userId } },
    update: {
      scores: body.scores,
      overallResult: body.overallResult,
      notes: body.notes || null,
      isSubmitted: Boolean(body.submit),
      submittedAt: body.submit ? new Date() : null,
    },
    create: {
      panelId: panel.id,
      applicationId: body.applicationId,
      scorerId: auth.context.userId,
      scores: body.scores,
      overallResult: body.overallResult,
      notes: body.notes || null,
      isSubmitted: Boolean(body.submit),
      submittedAt: body.submit ? new Date() : null,
    },
  })

  await createImmutableAuditEvent({
    prisma,
    districtId: panel.recruitmentCycle.districtId,
    recruitmentCycleId: panel.recruitmentCycleId,
    actorId: auth.context.userId,
    actorRole: auth.context.role,
    action: body.submit ? 'submit_shortlisting_score' : 'save_shortlisting_score',
    entityType: 'ShortlistingScore',
    entityId: score.id,
    afterState: score,
    ipAddress: req.headers.get('x-forwarded-for'),
  })

  return NextResponse.json({ score })
}
