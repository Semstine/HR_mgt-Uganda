import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const path = await prisma.onboardingPath.findUnique({
    where: { id: params.id },
    include: {
      steps: {
        orderBy: { stepOrder: 'asc' },
        include: { materials: { include: { material: true } } },
      },
      employeeOnboardings: {
        include: { employee: { select: { firstName: true, lastName: true, jobTitle: true } } },
      },
    },
  })

  if (!path || path.companyId !== session.user.companyId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ path })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const allowed = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER']
  if (!allowed.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, description, department, role, employmentType, durationDays, isActive } = body

  const path = await prisma.onboardingPath.update({
    where: { id: params.id },
    data: { name, description, department, role, employmentType, durationDays, isActive },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  })
  return NextResponse.json({ path })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const allowed = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER']
  if (!allowed.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.onboardingPath.update({ where: { id: params.id }, data: { isActive: false } })
  return NextResponse.json({ message: 'Path deactivated' })
}
