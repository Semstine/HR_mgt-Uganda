import { NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { createAuditEvent } from '@/lib/dsc-workflow'
import { publishToPSC } from '@/lib/integrations'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth()
    if (!['SECRETARY_DSC', 'NATIONAL_ADMIN_MOPS', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const advert = await withRetry(() =>
      prisma.advert.findUnique({ where: { id: params.id }, include: { recruitmentCycle: true } })
    )
    if (!advert) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (advert.status !== 'approved') return NextResponse.json({ error: 'Advert must be approved before publishing' }, { status: 400 })

    const body = await req.json()
    const channels: string[] = body.channels || ['notice_board_pdf', 'website']

    const logs = await Promise.all(
      channels.map(async (channel) => {
        let externalRef: string | null = null
        if (channel === 'psc_portal') {
          const result = await publishToPSC({ advertId: advert.id, postTitle: advert.postTitle })
          externalRef = result.reference ?? null
        }
        return withRetry(() =>
          prisma.advertPublicationLog.create({
            data: {
              advertId: advert.id,
              channel,
              status: 'successful',
              publishedAt: new Date(),
              reference: externalRef,
            },
          })
        )
      })
    )

    await withRetry(() =>
      prisma.advert.update({ where: { id: params.id }, data: { status: 'published', publishedAt: new Date() } })
    )

    await createAuditEvent({
      entityType: 'Advert',
      entityId: params.id,
      action: 'ADVERT_PUBLISHED',
      actorId: session.user.id,
      metadata: { channels },
    })

    return NextResponse.json({ data: logs })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
