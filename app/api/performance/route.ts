import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generatePerformanceSummary } from '@/lib/ai'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get('employeeId')
  const status = searchParams.get('status')

  const reviews = await prisma.performanceReview.findMany({
    where: {
      employee: { companyId: session.user.companyId },
      ...(employeeId ? { employeeId } : {}),
      ...(status ? { status: status as never } : {}),
    },
    orderBy: { dueDate: 'asc' },
    include: { employee: { select: { firstName: true, lastName: true, jobTitle: true } } },
  })

  return NextResponse.json({ reviews })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { employeeId, cycle, period, dueDate, goals } = await req.json()
  if (!employeeId || !cycle || !period || !dueDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const review = await prisma.performanceReview.create({
    data: {
      employeeId,
      cycle,
      period,
      dueDate: new Date(dueDate),
      goals,
      status: 'PENDING',
    },
  })

  return NextResponse.json({ review }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reviewId, selfEvaluation, supervisorEvaluation, goalsScore, skillsScore, overallScore, comments, ...rest } = await req.json()

  const review = await prisma.performanceReview.update({
    where: { id: reviewId },
    data: {
      selfEvaluation,
      supervisorEvaluation,
      goalsScore,
      skillsScore,
      overallScore,
      comments,
      status: 'IN_PROGRESS',
      ...rest,
    },
    include: { employee: { select: { firstName: true, lastName: true, jobTitle: true } } },
  })

  if (selfEvaluation && supervisorEvaluation) {
    try {
      const summary = await generatePerformanceSummary({
        employeeName: `${review.employee.firstName} ${review.employee.lastName}`,
        jobTitle: review.employee.jobTitle,
        selfEvaluation: selfEvaluation as Record<string, unknown>,
        supervisorEvaluation: supervisorEvaluation as Record<string, unknown>,
        period: review.period,
      })
      await prisma.performanceReview.update({
        where: { id: reviewId },
        data: {
          aiSummary: summary.summary,
          recommendations: summary.recommendations,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      })
    } catch {
      // AI summary optional
    }
  }

  return NextResponse.json({ review })
}
