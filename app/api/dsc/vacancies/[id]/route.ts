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
          declaredBy: { select: { id: true, name: true } },
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
      if (!['CAO', 'SUPER_ADMIN'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const clearance = await withRetry(() =>
        prisma.wageBillClearance.create({
          data: {
            vacancyId: params.id,
            approvedById: session.user.id,
            mopsReference: body.mopsReference,
            approvedPosts: body.approvedPosts,
            notes: body.notes,
          },
        })
      )
      await prisma.vacancyDeclaration.update({
        where: { id: params.id },
        data: { status: 'wage_bill_cleared' },
      })
      await createAuditEvent({
        entityType: 'VacancyDeclaration',
        entityId: params.id,
        action: 'WAGE_BILL_CLEARED',
        actorId: session.user.id,
        metadata: { mopsReference: body.mopsReference },
      })
      return NextResponse.json({ data: clearance })
    }

    const updated = await withRetry(() =>
      prisma.vacancyDeclaration.update({
        where: { id: params.id },
        data: { status: body.status, justification: body.justification },
      })
    )
    return NextResponse.json({ data: updated })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
