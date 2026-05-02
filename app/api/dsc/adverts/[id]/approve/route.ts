import { NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { createAuditEvent } from '@/lib/dsc-workflow'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth()
    if (!['DSC_CHAIRPERSON', 'NATIONAL_ADMIN_MOPS', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden — only DSC Chairperson can approve adverts' }, { status: 403 })
    }
    const body = await req.json()
    const advert = await withRetry(() =>
      prisma.advert.update({
        where: { id: params.id },
        data: {
          status: 'approved',
          approvedById: session.user.id,
          approvalMinuteRef: body.minuteRef,
          approvedAt: new Date(),
        },
      })
    )
    await createAuditEvent({
      entityType: 'Advert',
      entityId: params.id,
      action: 'ADVERT_APPROVED',
      actorId: session.user.id,
      metadata: { minuteRef: body.minuteRef },
    })
    return NextResponse.json({ data: advert })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
