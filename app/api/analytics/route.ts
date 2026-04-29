import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format, subMonths, startOfMonth, endOfMonth, differenceInDays } from 'date-fns'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const companyId = session.user.companyId

  const { searchParams } = new URL(req.url)
  const deptFilter = searchParams.get('department')
  const dateFrom = searchParams.get('from') ? new Date(searchParams.get('from')!) : subMonths(new Date(), 12)
  const dateTo = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date()

  const [
    totalEmployees,
    activeJobs,
    allCandidates,
    reviews,
    allReviews,
    departments,
    employees,
    leaveRecords,
    offers,
    interviews,
    compensationChanges,
  ] = await Promise.all([
    prisma.employee.count({ where: { companyId, isActive: true, ...(deptFilter ? { department: { name: deptFilter } } : {}) } }),
    prisma.job.count({ where: { companyId, status: 'ACTIVE' } }),
    prisma.candidate.findMany({
      where: { job: { companyId }, applicationDate: { gte: dateFrom, lte: dateTo } },
      select: { status: true, applicationDate: true, screeningScore: true, source: true, jobId: true, job: { select: { title: true } } },
    }),
    prisma.performanceReview.findMany({
      where: { employee: { companyId }, overallScore: { not: null } },
      select: { period: true, overallScore: true, status: true, promotionRecommended: true },
      orderBy: { period: 'asc' },
    }),
    prisma.performanceReview.findMany({
      where: { employee: { companyId } },
      select: { status: true },
    }),
    prisma.department.findMany({
      where: { companyId },
      include: { _count: { select: { employees: { where: { isActive: true } } } } },
    }),
    prisma.employee.findMany({
      where: { companyId, isActive: true },
      select: { startDate: true, endDate: true, isActive: true },
    }),
    prisma.leaveRecord.findMany({
      where: { employee: { companyId }, startDate: { gte: dateFrom } },
      select: { leaveType: true, days: true, status: true },
    }),
    prisma.offer.findMany({
      where: { candidate: { job: { companyId } } },
      select: { status: true, sentAt: true, signedAt: true },
    }),
    prisma.interview.findMany({
      where: { candidate: { job: { companyId } } },
      select: { status: true },
    }),
    prisma.compensationChange.findMany({
      where: { employee: { companyId }, status: 'pending' },
      select: { id: true },
    }),
  ])

  // ─── Hiring funnel ────────────────────────────────────────────────────────
  const funnelStages = ['RECEIVED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'FINAL_INTERVIEW', 'OFFER_SENT', 'OFFER_ACCEPTED']
  const hiringFunnel = funnelStages.map((stage) => ({
    stage: stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    count: allCandidates.filter((c) => c.status === stage).length,
  }))

  // ─── Headcount by department ──────────────────────────────────────────────
  const headcountByDepartment = departments
    .filter((d) => d._count.employees > 0)
    .map((d) => ({ department: d.name, count: d._count.employees }))

  // ─── Candidates by source ─────────────────────────────────────────────────
  const sourceCounts: Record<string, number> = {}
  allCandidates.forEach((c) => {
    const src = c.source || 'direct'
    sourceCounts[src] = (sourceCounts[src] || 0) + 1
  })
  const candidatesBySource = Object.entries(sourceCounts).map(([source, count]) => ({ source, count }))

  // ─── Applicants per role ──────────────────────────────────────────────────
  const roleCounts: Record<string, number> = {}
  allCandidates.forEach((c) => {
    const title = c.job.title
    roleCounts[title] = (roleCounts[title] || 0) + 1
  })
  const applicantsPerRole = Object.entries(roleCounts)
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // ─── Applications per month ───────────────────────────────────────────────
  const candidatesByMonth = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(new Date(), 5 - i)
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    const count = allCandidates.filter((c) => {
      const d = new Date(c.applicationDate)
      return d >= start && d <= end
    }).length
    return { month: format(month, 'MMM yyyy'), count }
  })

  // ─── Time to hire ─────────────────────────────────────────────────────────
  const signedOffers = offers.filter((o) => o.status === 'signed' && o.sentAt && o.signedAt)
  const avgTimeToHire = signedOffers.length > 0
    ? Math.round(signedOffers.reduce((sum, o) => sum + differenceInDays(o.signedAt!, o.sentAt!), 0) / signedOffers.length)
    : 0

  // ─── Offer acceptance rate ────────────────────────────────────────────────
  const sentOffers = offers.filter((o) => ['sent', 'signed', 'declined'].includes(o.status)).length
  const acceptedOffers = offers.filter((o) => o.status === 'signed').length
  const offerAcceptanceRate = sentOffers > 0 ? Math.round((acceptedOffers / sentOffers) * 100) : 0

  // ─── Interview completion ─────────────────────────────────────────────────
  const totalInterviews = interviews.length
  const completedInterviews = interviews.filter((i) => i.status === 'completed').length
  const interviewCompletionRate = totalInterviews > 0 ? Math.round((completedInterviews / totalInterviews) * 100) : 0

  // ─── Avg screening score ──────────────────────────────────────────────────
  const scored = allCandidates.filter((c) => c.screeningScore !== null)
  const avgScreeningScore = scored.length > 0
    ? Math.round(scored.reduce((s, c) => s + (c.screeningScore ?? 0), 0) / scored.length)
    : 0

  // ─── Leave by type ────────────────────────────────────────────────────────
  const leaveByTypeCounts: Record<string, number> = {}
  leaveRecords.filter((l) => l.status === 'approved').forEach((l) => {
    leaveByTypeCounts[l.leaveType] = (leaveByTypeCounts[l.leaveType] || 0) + l.days
  })
  const leaveByType = Object.entries(leaveByTypeCounts).map(([type, days]) => ({ type, days }))

  // ─── Performance score trend ──────────────────────────────────────────────
  const reviewsByPeriod: Record<string, number[]> = {}
  reviews.forEach((r) => {
    if (!reviewsByPeriod[r.period]) reviewsByPeriod[r.period] = []
    reviewsByPeriod[r.period].push(r.overallScore!)
  })
  const performanceScoreTrend = Object.entries(reviewsByPeriod)
    .slice(-6)
    .map(([period, scores]) => ({
      period,
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }))

  // ─── Review completion ────────────────────────────────────────────────────
  const completedReviews = allReviews.filter((r) => r.status === 'COMPLETED').length
  const reviewCompletionRate = allReviews.length > 0
    ? Math.round((completedReviews / allReviews.length) * 100)
    : 0

  // ─── Promotion pipeline ───────────────────────────────────────────────────
  const promotionPipeline = reviews.filter((r) => r.promotionRecommended).length

  // ─── Recent hires (last 30 days) ─────────────────────────────────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const recentHires = employees.filter((e) => new Date(e.startDate) >= thirtyDaysAgo).length

  // ─── Onboarding in progress ───────────────────────────────────────────────
  const onboardingInProgress = await prisma.onboarding.count({
    where: { employee: { companyId }, status: 'in-progress' },
  })

  // ─── Pending reviews ─────────────────────────────────────────────────────
  const pendingReviews = allReviews.filter((r) => r.status === 'PENDING').length

  return NextResponse.json({
    analytics: {
      totalEmployees,
      openPositions: activeJobs,
      activeCandidates: allCandidates.filter((c) => !['ARCHIVED', 'REJECTED', 'EMPLOYEE_ACTIVE'].includes(c.status)).length,
      pendingReviews,
      timeToHire: avgTimeToHire,
      turnoverRate: 0,
      recentHires,
      onboardingInProgress,
      headcountByDepartment,
      hiringFunnel,
      candidatesBySource,
      applicantsPerRole,
      candidatesByMonth,
      offerAcceptanceRate,
      interviewCompletionRate,
      avgScreeningScore,
      leaveByType,
      performanceScoreTrend,
      reviewCompletionRate,
      promotionPipeline,
      pendingCompensationChanges: compensationChanges.length,
    },
  })
}
