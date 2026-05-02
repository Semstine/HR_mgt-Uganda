import { NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(req.url)
    const districtId = searchParams.get('districtId') || session.user.districtId
    const type = searchParams.get('type') || 'overview'
    const financialYear = searchParams.get('financialYear') || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`

    if (type === 'overview') {
      const [cycles, applications, employees, flags, leaves] = await Promise.all([
        withRetry(() => prisma.recruitmentCycle.count({ where: { ...(districtId ? { districtId } : {}), financialYear } })),
        withRetry(() => prisma.pSCForm3Application.count({
          where: { recruitmentCycle: { ...(districtId ? { districtId } : {}), financialYear } },
        })),
        withRetry(() => prisma.employeeGovernmentProfile.count({ where: { ...(districtId ? { districtId } : {}) } })),
        withRetry(() => prisma.ghostWorkerFlag.count({ where: { ...(districtId ? { districtId } : {}), status: 'open' } })),
        withRetry(() => prisma.leaveRequest.count({
          where: { employee: { ...(districtId ? { districtId } : {}) }, status: 'pending' },
        })),
      ])
      return NextResponse.json({ data: { cycles, applications, employees, flags, leaves, financialYear } })
    }

    if (type === 'affirmative_action') {
      const breakdown = await withRetry(() =>
        prisma.employeeGovernmentProfile.groupBy({
          by: ['gender'],
          where: { ...(districtId ? { districtId } : {}) },
          _count: { id: true },
        })
      )
      const disability = await withRetry(() =>
        prisma.pSCForm3Application.count({
          where: {
            recruitmentCycle: { ...(districtId ? { districtId } : {}) },
            pwdStatus: true,
          },
        })
      )
      return NextResponse.json({ data: { genderBreakdown: breakdown, disabilityApplicants: disability } })
    }

    if (type === 'fraud') {
      const [ghostWorkers, fraudFlags, forgeries] = await Promise.all([
        withRetry(() => prisma.ghostWorkerFlag.findMany({
          where: { ...(districtId ? { districtId } : {}) },
          orderBy: { flaggedAt: 'desc' },
          take: 50,
        })),
        withRetry(() => prisma.fraudFlag.findMany({
          where: { ...(districtId ? { districtId } : {}) },
          orderBy: { detectedAt: 'desc' },
          take: 50,
        })),
        withRetry(() => prisma.fraudFlag.count({
          where: { ...(districtId ? { districtId } : {}), status: { not: 'cleared' } },
        })),
      ])
      return NextResponse.json({ data: { ghostWorkers, fraudFlags, forgeries } })
    }

    if (type === 'statutory') {
      const reports = await withRetry(() =>
        prisma.statutoryReport.findMany({
          where: { ...(districtId ? { districtId } : {}) },
          orderBy: { generatedAt: 'desc' },
          take: 20,
        })
      )
      return NextResponse.json({ data: { reports } })
    }

    return NextResponse.json({ error: 'Unknown report type' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}
