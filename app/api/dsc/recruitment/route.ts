import { NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { DSC_RECRUITMENT_WORKFLOW, createAuditEvent, recruitmentStatusForStep } from '@/lib/dsc-workflow'

export async function GET(req: Request) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(req.url)
    const districtId = searchParams.get('districtId') || session.user.districtId

    const cycles = await withRetry(() =>
      prisma.recruitmentCycle.findMany({
        where: { ...(districtId ? { districtId } : {}) },
        include: {
          district: true,
          vacancyDeclaration: { include: { staffStructure: { include: { salaryScale: true } } } },
          workflowSteps: { orderBy: { stepNumber: 'asc' } },
          advert: true,
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    )
    return NextResponse.json({ data: cycles })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth()
    if (!['SECRETARY_DSC', 'DHRO', 'CAO', 'DSC_CHAIRPERSON', 'NATIONAL_ADMIN_MOPS', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await req.json()

    const district = await withRetry(() =>
      prisma.district.findUnique({ where: { id: body.districtId || session.user.districtId! } })
    )
    if (!district) return NextResponse.json({ error: 'District not found' }, { status: 404 })

    const count = await prisma.recruitmentCycle.count({ where: { districtId: district.id } })
    const postRef = body.postRef || `${district.code}/${new Date().getFullYear()}/${String(count + 1).padStart(3, '0')}`

    const cycle = await withRetry(() =>
      prisma.recruitmentCycle.create({
        data: {
          districtId: district.id,
          vacancyDeclarationId: body.vacancyDeclarationId || null,
          postTitle: body.postTitle,
          postRef,
          grade: body.grade,
          department: body.department,
          numberOfPosts: body.numberOfPosts ?? 1,
          currentStep: 1,
          status: recruitmentStatusForStep(1),
          secretaryId: session.user.role === 'SECRETARY_DSC' ? session.user.id : body.secretaryId || null,
          financialYear: body.financialYear || String(new Date().getFullYear()),
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
    )

    await createAuditEvent({
      entityType: 'RecruitmentCycle',
      entityId: cycle.id,
      action: 'RECRUITMENT_CYCLE_CREATED',
      actorId: session.user.id,
      districtId: district.id,
      metadata: { postRef },
    })

    return NextResponse.json({ data: cycle }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
