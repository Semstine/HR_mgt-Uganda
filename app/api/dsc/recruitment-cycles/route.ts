import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireDscApi, scopedDistrictWhere } from '@/lib/dsc-rbac'
import { DSC_RECRUITMENT_WORKFLOW, createImmutableAuditEvent, recruitmentStatusForStep } from '@/lib/dsc-workflow'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const districtId = searchParams.get('districtId')
  const auth = await requireDscApi(req, [], districtId)
  if ('error' in auth) return auth.error

  const cycles = await prisma.recruitmentCycle.findMany({
    where: scopedDistrictWhere(auth.context, districtId),
    include: {
      district: true,
      establishmentNotice: true,
      vacancyDeclaration: true,
      workflowSteps: { orderBy: { stepNumber: 'asc' } },
      _count: { select: { applications: true, appointmentDecisions: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ cycles, workflow: DSC_RECRUITMENT_WORKFLOW })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const districtId = body.districtId
  const auth = await requireDscApi(req, [], districtId)
  if ('error' in auth) return auth.error

  const allowed = ['HOD', 'DHRO', 'CAO', 'SECRETARY_DSC'].includes(auth.context.role)
  if (!allowed) return NextResponse.json({ error: 'Only HoD, DHRO, CAO, or Secretary DSC can start recruitment cycles' }, { status: 403 })

  const establishmentNotice = await prisma.establishmentNotice.findFirst({
    where: { id: body.establishmentNoticeId, districtId, status: 'active' },
  })
  if (!establishmentNotice) {
    return NextResponse.json({ error: 'A valid active Establishment Notice is required before recruitment can start' }, { status: 400 })
  }

  const cycle = await prisma.recruitmentCycle.create({
    data: {
      districtId,
      establishmentNoticeId: establishmentNotice.id,
      vacancyDeclarationId: body.vacancyDeclarationId || null,
      postTitle: body.postTitle,
      postRef: body.postRef,
      grade: body.grade,
      department: body.department,
      numberOfPosts: Number(body.numberOfPosts || 1),
      currentStep: 1,
      status: recruitmentStatusForStep(1),
      secretaryId: auth.context.role === 'SECRETARY_DSC' ? auth.context.userId : body.secretaryId || null,
      chairpersonId: body.chairpersonId || null,
      financialYear: body.financialYear || establishmentNotice.financialYear,
      startedAt: new Date(),
      notes: body.notes || null,
      workflowSteps: {
        create: DSC_RECRUITMENT_WORKFLOW.map((step) => ({
          stepNumber: step.stepNumber,
          stepName: step.stepName,
          actorRole: step.actorRole,
          status: step.stepNumber === 1 ? 'in_progress' : 'pending',
          startedAt: step.stepNumber === 1 ? new Date() : null,
        })),
      },
    },
    include: { workflowSteps: { orderBy: { stepNumber: 'asc' } } },
  })

  await createImmutableAuditEvent({
    prisma,
    districtId,
    recruitmentCycleId: cycle.id,
    actorId: auth.context.userId,
    actorRole: auth.context.role,
    action: 'create_recruitment_cycle',
    entityType: 'RecruitmentCycle',
    entityId: cycle.id,
    afterState: cycle,
    ipAddress: req.headers.get('x-forwarded-for'),
    metadata: { postRef: cycle.postRef, currentStep: cycle.currentStep },
  })

  return NextResponse.json({ cycle }, { status: 201 })
}
