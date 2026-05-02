import { NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { initializeWorkflowSteps, generatePostRef, createAuditEvent } from '@/lib/dsc-workflow'

export async function GET(req: Request) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(req.url)
    const districtId = searchParams.get('districtId') || session.user.districtId

    const cycles = await withRetry(() =>
      prisma.recruitmentCycle.findMany({
        where: { districtId: districtId || undefined },
        include: {
          district: true,
          vacancy: {
            include: { department: true, staffStructure: { include: { salaryScale: true } } },
          },
          workflowSteps: { orderBy: { stepNumber: 'asc' } },
          adverts: { orderBy: { createdAt: 'desc' }, take: 1 },
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

    const district = await withRetry(() => prisma.district.findUnique({ where: { id: body.districtId || session.user.districtId! } }))
    if (!district) return NextResponse.json({ error: 'District not found' }, { status: 404 })

    const postRef = await generatePostRef(district.id, district.code)

    const cycle = await withRetry(() =>
      prisma.recruitmentCycle.create({
        data: {
          districtId: district.id,
          vacancyId: body.vacancyId,
          postReference: postRef,
          financialYear: body.financialYear,
          postsAdvertised: body.postsAdvertised,
        },
      })
    )

    await initializeWorkflowSteps(cycle.id)

    await createAuditEvent({
      entityType: 'RecruitmentCycle',
      entityId: cycle.id,
      action: 'RECRUITMENT_CYCLE_CREATED',
      actorId: session.user.id,
      districtId: district.id,
      metadata: { postReference: postRef },
    })

    return NextResponse.json({ data: cycle }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
