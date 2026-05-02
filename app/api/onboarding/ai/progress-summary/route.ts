import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { summarizeOnboardingProgress } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { employeeOnboardingId } = await req.json()
  if (!employeeOnboardingId) return NextResponse.json({ error: 'employeeOnboardingId required' }, { status: 400 })

  const onboarding = await prisma.employeeOnboarding.findUnique({
    where: { id: employeeOnboardingId },
    include: {
      employee: {
        select: { firstName: true, lastName: true, jobTitle: true, startDate: true, department: { select: { name: true } } },
      },
      path: { select: { name: true } },
      tasks: { orderBy: { dueDate: 'asc' } },
    },
  })

  if (!onboarding) return NextResponse.json({ error: 'Onboarding record not found' }, { status: 404 })

  const now = new Date()
  const result = await summarizeOnboardingProgress({
    employee: {
      name: `${onboarding.employee.firstName} ${onboarding.employee.lastName}`,
      jobTitle: onboarding.employee.jobTitle,
      department: onboarding.employee.department?.name,
      startDate: onboarding.employee.startDate.toISOString().slice(0, 10),
    },
    path: onboarding.path?.name,
    progressPercent: onboarding.progressPercent,
    tasks: onboarding.tasks.map((t) => ({
      title: t.title,
      status: t.status,
      ownerRole: t.ownerRole,
      dueDate: t.dueDate?.toISOString().slice(0, 10),
      overdue: t.status === 'pending' && !!t.dueDate && t.dueDate < now,
    })),
    startedAt: onboarding.startedAt.toISOString().slice(0, 10),
  })

  // Log the AI summary generation
  await prisma.onboardingActivityLog.create({
    data: {
      employeeOnboardingId,
      actorId: session.user.id,
      action: 'ai_summary_generated',
      details: `Risk level: ${result.riskLevel} | ${result.estimatedCompletion}`,
    },
  })

  return NextResponse.json({ summary: result })
}
