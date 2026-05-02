import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireDscApi } from '@/lib/dsc-rbac'
import { canActOnStep, createImmutableAuditEvent, getWorkflowStep, recruitmentStatusForStep } from '@/lib/dsc-workflow'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const cycle = await prisma.recruitmentCycle.findUnique({
    where: { id: params.id },
    include: { workflowSteps: { orderBy: { stepNumber: 'asc' } }, establishmentNotice: true },
  })

  if (!cycle) return NextResponse.json({ error: 'Recruitment cycle not found' }, { status: 404 })
  const auth = await requireDscApi(req, [], cycle.districtId)
  if ('error' in auth) return auth.error

  if (!canActOnStep(auth.context.role, cycle.currentStep)) {
    return NextResponse.json({ error: `Role ${auth.context.role} cannot advance step ${cycle.currentStep}` }, { status: 403 })
  }

  const currentStepDef = getWorkflowStep(cycle.currentStep)
  if (!currentStepDef) return NextResponse.json({ error: 'Workflow is already complete' }, { status: 400 })
  if (body.action && !currentStepDef.allowedActions.includes(body.action)) {
    return NextResponse.json({ error: `Action ${body.action} is not valid for this step` }, { status: 400 })
  }

  if (cycle.currentStep >= 5 && !cycle.establishmentNotice) {
    return NextResponse.json({ error: 'Establishment Notice gate blocks advertisement and later steps' }, { status: 400 })
  }

  const beforeState = cycle
  const nextStep = cycle.currentStep + 1
  const completeCycle = nextStep > 17

  await prisma.recruitmentWorkflowStep.updateMany({
    where: { recruitmentCycleId: cycle.id, stepNumber: cycle.currentStep },
    data: {
      status: 'completed',
      completedAt: new Date(),
      actorId: auth.context.userId,
      notes: body.notes || null,
      documentsGenerated: body.documentsGenerated || [],
    },
  })

  if (!completeCycle) {
    await prisma.recruitmentWorkflowStep.updateMany({
      where: { recruitmentCycleId: cycle.id, stepNumber: nextStep },
      data: { status: 'in_progress', startedAt: new Date() },
    })
  }

  const updated = await prisma.recruitmentCycle.update({
    where: { id: cycle.id },
    data: {
      currentStep: completeCycle ? 17 : nextStep,
      status: completeCycle ? 'completed' : recruitmentStatusForStep(nextStep),
      completedAt: completeCycle ? new Date() : null,
    },
    include: { workflowSteps: { orderBy: { stepNumber: 'asc' } } },
  })

  await createImmutableAuditEvent({
    prisma,
    districtId: updated.districtId,
    recruitmentCycleId: updated.id,
    actorId: auth.context.userId,
    actorRole: auth.context.role,
    action: body.action || `complete_step_${cycle.currentStep}`,
    entityType: 'RecruitmentCycle',
    entityId: updated.id,
    beforeState,
    afterState: updated,
    ipAddress: req.headers.get('x-forwarded-for'),
    metadata: { fromStep: cycle.currentStep, toStep: updated.currentStep, documentsGenerated: body.documentsGenerated || [] },
  })

  return NextResponse.json({ cycle: updated })
}
