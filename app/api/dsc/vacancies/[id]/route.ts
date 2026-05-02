import { NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { createAuditEvent } from '@/lib/dsc-workflow'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth()
    const vacancy = await withRetry(() =>
      prisma.vacancyDeclaration.findUnique({
        where: { id: params.id },
        include: {
          department: true,
          staffStructure: { include: { salaryScale: true } },
          wageBillClearances: true,
        },
      })
    )
    if (!vacancy) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ data: vacancy })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth()
    const body = await req.json()

    if (body.action === 'approve_wage_bill') {
      if (!['CAO', 'SUPER_ADMIN', 'NATIONAL_ADMIN_MOPS'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const vacancy = await withRetry(() =>
        prisma.vacancyDeclaration.findUnique({ where: { id: params.id } })
      )
      if (!vacancy) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const clearance = await withRetry(() =>
        prisma.wageBillClearance.create({
          data: {
            districtId: vacancy.districtId,
            vacancyDeclarationId: params.id,
            requestedBy: session.user.id,
            requestedAt: new Date(),
            approvedBy: session.user.id,
            approvedAt: new Date(),
            financialYear: body.financialYear || new Date().getFullYear().toString(),
            postsRequested: body.postsRequested || vacancy.numberOfVacancies,
            wageImpact: body.wageImpact || 0,
            status: 'approved',
            mopsRef: body.mopsReference,
            notes: body.notes,
          },
        })
      )
      await prisma.vacancyDeclaration.update({
        where: { id: params.id },
        data: { status: 'cleared' },
      })
      await createAuditEvent({
        entityType: 'VacancyDeclaration',
        entityId: params.id,
        action: 'WAGE_BILL_CLEARED',
        actorId: session.user.id,
        metadata: { mopsRef: body.mopsReference },
      })
      return NextResponse.json({ data: clearance })
    }

    const updated = await withRetry(() =>
      prisma.vacancyDeclaration.update({
        where: { id: params.id },
        data: { status: body.status, hodNotes: body.notes },
      })
    )
    return NextResponse.json({ data: updated })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
