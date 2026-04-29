import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    include: { departments: true, settings: true },
  })
  return NextResponse.json({ company })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { departments = [], aiSuggestions, setupComplete, ...rest } = body

  const deptNames = (departments as string[]).filter(Boolean)

  const company = await prisma.company.update({
    where: { id: session.user.companyId },
    data: { ...rest, aiSuggestions, setupComplete },
  })

  if (deptNames.length > 0) {
    const existing = await prisma.department.findMany({ where: { companyId: company.id }, select: { name: true } })
    const existingNames = existing.map((d) => d.name)
    const newDepts = deptNames.filter((n) => !existingNames.includes(n))
    if (newDepts.length > 0) {
      await prisma.department.createMany({
        data: newDepts.map((name) => ({ name, companyId: company.id })),
      })
    }
  }

  return NextResponse.json({ company })
}
