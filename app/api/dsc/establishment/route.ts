import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireDscApi, scopedDistrictWhere } from '@/lib/dsc-rbac'

export async function GET(req: NextRequest) {
  const districtId = new URL(req.url).searchParams.get('districtId')
  const auth = await requireDscApi(req, [], districtId)
  if ('error' in auth) return auth.error

  const where = scopedDistrictWhere(auth.context, districtId)
  const [structures, notices, vacancies, clearances] = await Promise.all([
    prisma.approvedStaffStructure.findMany({
      where,
      include: { district: true, department: true, salaryScale: true },
      orderBy: [{ district: { name: 'asc' } }, { postTitle: 'asc' }],
    }),
    prisma.establishmentNotice.findMany({ where, orderBy: { issuedDate: 'desc' } }),
    prisma.vacancyDeclaration.findMany({ where, include: { department: true, staffStructure: true }, orderBy: { createdAt: 'desc' } }),
    prisma.wageBillClearance.findMany({ where, include: { establishmentNotice: true, vacancyDeclaration: true }, orderBy: { requestedAt: 'desc' } }),
  ])

  const totals = structures.reduce((acc, item) => {
    acc.approvedPosts += item.approvedPosts
    acc.filledPosts += item.filledPosts
    acc.vacantPosts += item.vacantPosts
    acc.underRecruitment += item.underRecruitment
    return acc
  }, { approvedPosts: 0, filledPosts: 0, vacantPosts: 0, underRecruitment: 0 })

  const wageEnvelope = notices
    .filter((notice) => notice.status === 'active')
    .reduce((sum, notice) => sum + notice.wageEnvelope, 0)

  return NextResponse.json({
    summary: {
      ...totals,
      clearedPosts: clearances.filter((item) => item.status === 'approved').reduce((sum, item) => sum + item.postsRequested, 0),
      pendingClearance: clearances.filter((item) => item.status === 'pending' || item.status === 'under_review').length,
      wageEnvelope,
    },
    structures,
    notices,
    vacancies,
    clearances,
  })
}
