import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    include: {
      department: true,
      onboarding: true,
      documents: { orderBy: { createdAt: 'desc' } },
      performanceReviews: { orderBy: { dueDate: 'desc' } },
      leaveRecords: { orderBy: { startDate: 'desc' } },
      salaryHistory: { orderBy: { effectiveDate: 'desc' } },
      caseFiles: { orderBy: { dateOpened: 'desc' } },
    },
  })

  if (!employee || employee.companyId !== session.user.companyId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ employee })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const employee = await prisma.employee.update({ where: { id: params.id }, data: body })
  return NextResponse.json({ employee })
}
