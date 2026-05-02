import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recommendOnboardingPath } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { employeeId } = await req.json()
  if (!employeeId) return NextResponse.json({ error: 'employeeId required' }, { status: 400 })

  const [employee, paths] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: employeeId },
      include: { department: { select: { name: true } } },
    }),
    prisma.onboardingPath.findMany({
      where: { companyId: session.user.companyId, isActive: true },
      include: { _count: { select: { steps: true } } },
    }),
  ])

  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  if (!paths.length) return NextResponse.json({ error: 'No active onboarding paths found' }, { status: 404 })

  const result = await recommendOnboardingPath({
    paths: paths.map((p) => ({
      id: p.id,
      name: p.name,
      department: p.department,
      role: p.role,
      employmentType: p.employmentType,
      durationDays: p.durationDays,
      steps: p._count.steps,
    })),
    employee: {
      jobTitle: employee.jobTitle,
      department: employee.department?.name,
      employmentType: employee.employmentType,
      startDate: employee.startDate.toISOString().slice(0, 10),
    },
  })

  return NextResponse.json({ recommendation: result })
}
