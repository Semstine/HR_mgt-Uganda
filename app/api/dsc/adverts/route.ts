import { NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { createAuditEvent } from '@/lib/dsc-workflow'

export async function GET(req: Request) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(req.url)
    const districtId = searchParams.get('districtId') || session.user.districtId
    const status = searchParams.get('status')

    const adverts = await withRetry(() =>
      prisma.advert.findMany({
        where: {
          ...(districtId ? { districtId } : {}),
          ...(status ? { status } : {}),
        },
        include: {
          recruitmentCycle: {
            include: { vacancyDeclaration: { include: { staffStructure: true } } },
          },
          publicationLogs: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    )
    return NextResponse.json({ data: adverts })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth()
    if (!['SECRETARY_DSC', 'DHRO', 'DSC_CHAIRPERSON', 'NATIONAL_ADMIN_MOPS', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await req.json()

    const cycle = await withRetry(() =>
      prisma.recruitmentCycle.findUnique({ where: { id: body.recruitmentCycleId }, include: { district: true } })
    )
    if (!cycle) return NextResponse.json({ error: 'Recruitment cycle not found' }, { status: 404 })

    const advert = await withRetry(() =>
      prisma.advert.create({
        data: {
          recruitmentCycleId: body.recruitmentCycleId,
          districtId: cycle.districtId,
          postTitle: body.postTitle || cycle.postTitle,
          postRef: body.postRef || cycle.postRef,
          grade: body.grade || cycle.grade,
          salaryScale: body.salaryScale || cycle.grade,
          dutyStation: body.dutyStation || cycle.district.name,
          department: body.department || cycle.department,
          eligibilityCriteria: body.eligibilityCriteria,
          qualifications: body.qualifications,
          experience: body.experience,
          deadline: new Date(body.deadline),
          preparedBy: session.user.id,
        },
      })
    )

    await createAuditEvent({
      entityType: 'Advert',
      entityId: advert.id,
      action: 'ADVERT_CREATED',
      actorId: session.user.id,
      districtId: cycle.districtId,
      metadata: { recruitmentCycleId: body.recruitmentCycleId },
    })
    return NextResponse.json({ data: advert }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
