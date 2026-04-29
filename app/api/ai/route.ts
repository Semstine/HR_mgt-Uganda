import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { askHRAssistant } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const companyId = session.user.companyId

  const { question } = await req.json()
  if (!question) return NextResponse.json({ error: 'Question required' }, { status: 400 })

  const [
    employeeCount,
    activeJobs,
    candidatesInPipeline,
    pendingReviews,
    recentHires,
    shortlisted,
    onboardingPending,
  ] = await Promise.all([
    prisma.employee.count({ where: { companyId, isActive: true } }),
    prisma.job.findMany({ where: { companyId, status: 'ACTIVE' }, select: { title: true, _count: { select: { candidates: true } } } }),
    prisma.candidate.count({ where: { job: { companyId }, status: { notIn: ['ARCHIVED', 'REJECTED', 'EMPLOYEE_ACTIVE'] } } }),
    prisma.performanceReview.findMany({ where: { employee: { companyId }, status: 'PENDING' }, include: { employee: { select: { firstName: true, lastName: true } } } }),
    prisma.employee.findMany({ where: { companyId, startDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, select: { firstName: true, lastName: true, jobTitle: true, startDate: true } }),
    prisma.candidate.findMany({ where: { job: { companyId }, status: 'SHORTLISTED' }, include: { job: { select: { title: true } } } }),
    prisma.onboarding.count({ where: { employee: { companyId }, status: { not: 'complete' } } }),
  ])

  const context = `
Company HR Data Summary:
- Total active employees: ${employeeCount}
- Open job positions: ${activeJobs.length} (${activeJobs.map((j) => `${j.title}: ${j._count.candidates} applicants`).join(', ')})
- Candidates in active pipeline: ${candidatesInPipeline}
- Pending performance reviews: ${pendingReviews.length} (${pendingReviews.map((r) => `${r.employee.firstName} ${r.employee.lastName}`).join(', ')})
- New hires in last 30 days: ${recentHires.length} (${recentHires.map((e) => `${e.firstName} ${e.lastName} - ${e.jobTitle}`).join(', ')})
- Shortlisted candidates: ${shortlisted.length} (${shortlisted.map((c) => `${c.firstName} ${c.lastName} for ${c.job.title}`).join(', ')})
- Employees pending onboarding completion: ${onboardingPending}
`

  try {
    const result = await askHRAssistant({ question, context })
    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ answer: 'AI assistant is currently unavailable. Please check your API configuration.' })
  }
}
