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
          ...(districtId ? { districtId } : {}),
          ...(status ? { status } : {}),
        },
        include: {
          department: true,
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
    if (!canManageVacancies(session.user.role as any)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await req.json()
    const vacancy = await withRetry(() =>
      prisma.vacancyDeclaration.create({
        data: {
          districtId: body.districtId || session.user.districtId!,
          departmentId: body.departmentId,
          staffStructureId: body.staffStructureId,
          postTitle: body.postTitle,
          grade: body.grade,
          vacancyReason: body.vacancyReason,
          vacancyDate: body.vacancyDate ? new Date(body.vacancyDate) : new Date(),
          numberOfVacancies: body.numberOfVacancies ?? 1,
          hodId: session.user.id,
          hodNotes: body.notes,
        },
      })
    )
    await createAuditEvent({
      entityType: 'VacancyDeclaration',
      entityId: vacancy.id,
      action: 'VACANCY_DECLARED',
      actorId: session.user.id,
      districtId: vacancy.districtId,
      metadata: { numberOfVacancies: vacancy.numberOfVacancies, reason: vacancy.vacancyReason },
    })
    return NextResponse.json({ data: vacancy }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
