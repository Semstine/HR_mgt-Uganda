import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { suggestOnboardingMaterials } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { stepTitle, stepDescription, pathId, pathName, department, role } = await req.json()
  if (!stepTitle) return NextResponse.json({ error: 'stepTitle required' }, { status: 400 })

  // Get path details if pathId provided
  let resolvedPathName = pathName
  let resolvedDept = department
  let resolvedRole = role
  if (pathId) {
    const path = await prisma.onboardingPath.findUnique({ where: { id: pathId } })
    if (path) {
      resolvedPathName = path.name
      resolvedDept = resolvedDept ?? path.department
      resolvedRole = resolvedRole ?? path.role
    }
  }

  // Get existing materials to avoid duplicates
  const existing = await prisma.onboardingMaterial.findMany({
    where: { companyId: session.user.companyId, status: 'active' },
    select: { title: true, category: true },
  })

  const result = await suggestOnboardingMaterials({
    stepTitle,
    stepDescription,
    pathName: resolvedPathName || 'General Onboarding',
    department: resolvedDept,
    role: resolvedRole,
    existingMaterials: existing,
  })

  return NextResponse.json({ suggestions: result })
}
