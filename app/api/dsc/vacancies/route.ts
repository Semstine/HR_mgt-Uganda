import { NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { requireAuth, canManageVacancies } from '@/lib/auth'
import { createAuditEvent } from '@/lib/dsc-workflow'

export async function GET(req: Request) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(req.url)
    const districtId = searchParams.get('districtId') || session.user.districtId
    const status = searchParams.get('status')

    const vacancies = await withRetry(() =>
      prisma.vacancyDeclaration.findMany({
        where: {
          districtId: districtId || undefined,
          ...(status ? { status } : {}),
        },
        include: {
          department: true,
          declaredBy: { select: { id: true, name: true } },
          staffStructure: { include: { salaryScale: true } },
          wageBillClearances: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
      })
    )
    return NextResponse.json({ data: vacancies })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth()
    if (!['HOD', 'DHRO', 'CAO', 'SECRETARY_DSC', 'NATIONAL_ADMIN_MOPS', 'SUPER_ADMIN', 'COMPANY_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await req.json()
    const vacancy = await withRetry(() =>
      prisma.vacancyDeclaration.create({
        data: {
          districtId: body.districtId || session.user.districtId!,
          departmentId: body.departmentId,
          staffStructureId: body.staffStructureId,
          postsVacant: body.postsVacant,
          reason: body.reason,
          justification: body.justification,
          declaredById: session.user.id,
        },
      })
    )
    await createAuditEvent({
      entityType: 'VacancyDeclaration',
      entityId: vacancy.id,
      action: 'VACANCY_DECLARED',
      actorId: session.user.id,
      districtId: vacancy.districtId,
      metadata: { postsVacant: body.postsVacant, reason: body.reason },
    })
    return NextResponse.json({ data: vacancy }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
