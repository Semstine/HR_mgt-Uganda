import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireDscApi, scopedDistrictWhere } from '@/lib/dsc-rbac'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const districtId = searchParams.get('districtId')
  const recruitmentCycleId = searchParams.get('recruitmentCycleId')
  const status = searchParams.get('status')
  const auth = await requireDscApi(req, [], districtId)
  if ('error' in auth) return auth.error

  const applications = await prisma.pSCForm3Application.findMany({
    where: {
      ...scopedDistrictWhere(auth.context, districtId),
      ...(recruitmentCycleId ? { recruitmentCycleId } : {}),
      ...(status ? { status } : {}),
    },
    include: { recruitmentCycle: { select: { postTitle: true, postRef: true } }, documents: true, fraudFlags: true },
    orderBy: { submittedAt: 'desc' },
  })

  const dashboard = {
    total: applications.length,
    online: applications.filter((item) => item.intakeChannel === 'online').length,
    ussd: applications.filter((item) => item.intakeChannel === 'ussd').length,
    paper: applications.filter((item) => item.intakeChannel === 'paper').length,
    pwdCount: applications.filter((item) => item.pwdStatus).length,
    duplicateFlags: applications.filter((item) => item.duplicateFlag).length,
    documentComplete: applications.filter((item) => item.documentComplete).length,
    genderBalance: applications.reduce<Record<string, number>>((acc, item) => {
      const key = item.gender || 'not_provided'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {}),
  }

  return NextResponse.json({ applications, dashboard })
}
