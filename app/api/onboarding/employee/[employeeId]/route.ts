import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assignOnboardingPath } from '@/lib/onboarding'

export async function GET(_req: NextRequest, { params }: { params: { employeeId: string } }) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const onboarding = await prisma.employeeOnboarding.findUnique({
    where: { employeeId: params.employeeId },
    include: {
      employee: {
        select: {
          id: true, firstName: true, lastName: true, jobTitle: true,
          startDate: true, employmentType: true,
          department: { select: { name: true } },
        },
      },
      path: {
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      },
      tasks: { orderBy: { dueDate: 'asc' } },
      activityLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })

  if (!onboarding) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ onboarding })
}

export async function POST(req: NextRequest, { params }: { params: { employeeId: string } }) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const allowed = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'HR_OFFICER']
  if (!allowed.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const employee = await prisma.employee.findUnique({
    where: { id: params.employeeId },
    include: { department: true },
  })
  if (!employee || employee.companyId !== session.user.companyId) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  }

  const body = await req.json()
  const { manualPathId } = body

  const onboarding = await assignOnboardingPath(
    params.employeeId,
    session.user.companyId,
    {
      department: employee.department?.name,
      jobTitle: employee.jobTitle,
      employmentType: employee.employmentType,
      startDate: employee.startDate,
      assignedBy: session.user.id,
      manualPathId,
    }
  )

  return NextResponse.json({ onboarding }, { status: 201 })
}
