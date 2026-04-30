import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const paths = await prisma.onboardingPath.findMany({
    where: { companyId: session.user.companyId },
    include: {
      steps: {
        orderBy: { stepOrder: 'asc' },
        include: {
          materials: { include: { material: true } },
        },
      },
      _count: { select: { employeeOnboardings: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ paths })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const allowed = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER']
  if (!allowed.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, description, department, role, employmentType, durationDays, steps } = body

  if (!name) return NextResponse.json({ error: 'Path name is required' }, { status: 400 })

  const path = await prisma.onboardingPath.create({
    data: {
      companyId: session.user.companyId,
      name,
      description,
      department,
      role,
      employmentType,
      durationDays: durationDays ?? 30,
      isActive: true,
      steps: steps?.length
        ? {
            create: steps.map((s: { title: string; description?: string; ownerRole?: string; dueOffsetDays?: number; isRequired?: boolean }, i: number) => ({
              title: s.title,
              description: s.description,
              stepOrder: i + 1,
              ownerRole: s.ownerRole ?? 'employee',
              dueOffsetDays: s.dueOffsetDays ?? i + 1,
              isRequired: s.isRequired ?? true,
            })),
          }
        : undefined,
    },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  })

  return NextResponse.json({ path }, { status: 201 })
}
