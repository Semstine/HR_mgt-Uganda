import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateOnboardingSteps } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const allowed = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER']
  if (!allowed.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { pathId, pathName, department, role, employmentType, durationDays } = await req.json()

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { name: true },
  })

  const result = await generateOnboardingSteps({
    pathName: pathName || 'General Onboarding',
    department,
    role,
    employmentType,
    durationDays: durationDays || 30,
    companyName: company?.name || 'the company',
  })

  // If pathId provided, save the generated steps to the database
  if (pathId) {
    // Remove existing steps first (replace mode)
    const existing = await prisma.onboardingStep.findMany({ where: { pathId } })
    const lastOrder = existing.length ? Math.max(...existing.map(s => s.stepOrder)) : 0

    await prisma.onboardingStep.createMany({
      data: result.steps.map((s, i) => ({
        pathId,
        title: s.title,
        description: s.description,
        stepOrder: lastOrder + i + 1,
        ownerRole: s.ownerRole,
        dueOffsetDays: s.dueOffsetDays,
        isRequired: s.isRequired,
      })),
    })
  }

  return NextResponse.json({ result })
}
