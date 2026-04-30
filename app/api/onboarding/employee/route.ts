import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const pathId = searchParams.get('pathId')

  const onboardings = await prisma.employeeOnboarding.findMany({
    where: {
      employee: { companyId: session.user.companyId },
      ...(status ? { status } : {}),
      ...(pathId ? { pathId } : {}),
    },
    include: {
      employee: {
        select: {
          id: true, firstName: true, lastName: true, jobTitle: true,
          startDate: true, employmentType: true,
          department: { select: { name: true } },
        },
      },
      path: { select: { id: true, name: true, durationDays: true } },
      tasks: { orderBy: { dueDate: 'asc' } },
    },
    orderBy: { startedAt: 'desc' },
  })

  const stats = {
    total: onboardings.length,
    completed: onboardings.filter((o) => o.status === 'completed').length,
    inProgress: onboardings.filter((o) => o.status === 'in_progress').length,
    overdueTasks: onboardings.reduce((acc, o) => {
      return acc + o.tasks.filter((t) => t.status === 'pending' && t.dueDate && t.dueDate < new Date()).length
    }, 0),
  }

  return NextResponse.json({ onboardings, stats })
}
