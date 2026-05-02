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
          cycle: { districtId: districtId || undefined },
          ...(status ? { status } : {}),
        },
        include: {
          cycle: {
            include: { vacancy: { include: { department: true, staffStructure: true } } },
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
    const advert = await withRetry(() =>
      prisma.advert.create({
        data: {
          cycleId: body.cycleId,
          title: body.title,
          body: body.body,
          closingDate: new Date(body.closingDate),
          channels: body.channels ?? ['newspaper', 'website'],
          applicationFee: body.applicationFee ?? 0,
          createdById: session.user.id,
        },
      })
    )
    await createAuditEvent({
      entityType: 'Advert',
      entityId: advert.id,
      action: 'ADVERT_CREATED',
      actorId: session.user.id,
      metadata: { cycleId: body.cycleId },
    })
    return NextResponse.json({ data: advert }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
