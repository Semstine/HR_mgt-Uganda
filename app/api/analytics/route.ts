import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'

export async function GET() {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const companyId = session.user.companyId

  const [
    totalEmployees, activeJobs, allCandidates, reviews,
    departments, employees,
  ] = await Promise.all([
    prisma.employee.count({ where: { companyId, isActive: true } }),
    prisma.job.count({ where: { companyId, status: 'ACTIVE' } }),
    prisma.candidate.findMany({
      where: { job: { companyId } },
      select: { status: true, applicationDate: true },
    }),
    prisma.performanceReview.findMany({
      where: { employee: { companyId }, overallScore: { not: null } },
      select: { period: true, overallScore: true },
      orderBy: { period: 'asc' },
    }),
    prisma.department.findMany({
      where: { companyId },
      include: { _count: { select: { employees: { where: { isActive: true } } } } },
    }),
    prisma.employee.findMany({
      where: { companyId, isActive: true },
      select: { startDate: true },
    }),
  ])

  // Hiring funnel
  const funnelStages = ['RECEIVED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'FINAL_INTERVIEW', 'OFFER_SENT', 'OFFER_ACCEPTED']
  const hiringFunnel = funnelStages.map((stage) => ({
    stage: stage.replace(/_/g, ' ').toLowerCase(),
    count: allCandidates.filter((c) => c.status === stage).length,
  }))

  // Headcount by department
  const headcountByDept = departments
    .filter((d) => d._count.employees > 0)
    .map((d) => ({ department: d.name, count: d._count.employees }))

  // Candidates by month (last 6 months)
  const candidatesByMonth = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(new Date(), 5 - i)
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    const count = allCandidates.filter((c) => {
      const d = new Date(c.applicationDate)
      return d >= start && d <= end
    }).length
    return { month: format(month, 'MMM'), count }
  })

  // Review scores by period
  const reviewsByPeriod: Record<string, number[]> = {}
  reviews.forEach((r) => {
    if (!reviewsByPeriod[r.period]) reviewsByPeriod[r.period] = []
    reviewsByPeriod[r.period].push(r.overallScore!)
  })
  const reviewScores = Object.entries(reviewsByPeriod)
    .slice(-6)
    .map(([period, scores]) => ({
      period,
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
    }))

  // Status breakdown
  const statusCounts: Record<string, number> = {}
  allCandidates.forEach((c) => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1 })
  const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({ status, count }))

  // Time to hire (avg days from RECEIVED to OFFER_ACCEPTED)
  const avgTimeToHire = 0 // Would require tracking start/end dates precisely

  const analytics = {
    totalEmployees,
    activeJobs,
    totalCandidates: allCandidates.filter((c) => !['ARCHIVED', 'REJECTED', 'EMPLOYEE_ACTIVE'].includes(c.status)).length,
    avgTimeToHire,
    turnoverCount: 0,
    headcountByDept,
    hiringFunnel,
    reviewScores,
    candidatesByMonth,
    statusBreakdown,
  }

  return NextResponse.json({ analytics })
}
