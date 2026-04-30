import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const allowed = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER']
  if (!allowed.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { title, description, ownerRole, dueOffsetDays, isRequired } = body

  if (!title) return NextResponse.json({ error: 'Step title is required' }, { status: 400 })

  // Find current max stepOrder
  const lastStep = await prisma.onboardingStep.findFirst({
    where: { pathId: params.id },
    orderBy: { stepOrder: 'desc' },
  })

  const step = await prisma.onboardingStep.create({
    data: {
      pathId: params.id,
      title,
      description,
      stepOrder: (lastStep?.stepOrder ?? 0) + 1,
      ownerRole: ownerRole ?? 'employee',
      dueOffsetDays: dueOffsetDays ?? 1,
      isRequired: isRequired ?? true,
    },
  })

  return NextResponse.json({ step }, { status: 201 })
}
