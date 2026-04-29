import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowedRoles = ['COMPANY_ADMIN', 'HR_MANAGER']
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { action } = await req.json() // 'approve' | 'reject'

  const change = await prisma.compensationChange.findUnique({
    where: { id: params.id },
    include: { employee: true },
  })

  if (!change) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (change.employee.companyId !== session.user.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const updated = await prisma.compensationChange.update({
    where: { id: params.id },
    data: {
      status: action === 'approve' ? 'approved' : 'rejected',
      approvedBy: session.user.name,
      approvedAt: new Date(),
    },
  })

  // If approved and it's a salary change, apply it
  if (action === 'approve' && change.changeType === 'salary') {
    await prisma.employee.update({
      where: { id: change.employeeId },
      data: { salary: change.toAmount },
    })
    await prisma.salaryHistory.create({
      data: {
        employeeId: change.employeeId,
        salary: change.toAmount,
        currency: change.currency,
        effectiveDate: change.effectiveDate,
        reason: change.reason,
        approvedBy: session.user.name,
      },
    })
    await prisma.compensationChange.update({
      where: { id: params.id },
      data: { status: 'applied' },
    })
  }

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: action === 'approve' ? 'COMPENSATION_CHANGE_APPROVED' : 'COMPENSATION_CHANGE_REJECTED',
      resource: 'Employee',
      resourceId: change.employeeId,
      details: { changeId: params.id, changeType: change.changeType } as never,
    },
  })

  return NextResponse.json({ change: updated })
}
