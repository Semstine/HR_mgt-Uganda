import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireDscApi, scopedDistrictWhere } from '@/lib/dsc-rbac'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const districtId = searchParams.get('districtId')
  const auth = await requireDscApi(req, ['VIEW_AUDIT_LOG'], districtId)
  if ('error' in auth) return auth.error

  const events = await prisma.immutableAuditEvent.findMany({
    where: scopedDistrictWhere(auth.context, districtId),
    include: { district: { select: { name: true, code: true } }, recruitmentCycle: { select: { postRef: true, postTitle: true } } },
    orderBy: { timestamp: 'desc' },
    take: Number(searchParams.get('take') || 100),
  })

  return NextResponse.json({ events })
}
