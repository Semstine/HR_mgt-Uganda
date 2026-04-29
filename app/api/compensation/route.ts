import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get('employeeId')
  const status = searchParams.get('status')

  const changes = await prisma.compensationChange.findMany({
    where: {
      employee: { companyId: session.user.companyId },
      ...(employeeId ? { employeeId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      employee: { select: { firstName: true, lastName: true, jobTitle: true, employeeNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ changes })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { employeeId, changeType, description, fromAmount, toAmount, currency = 'UGX', effectiveDate, reason, notes } = body

  if (!employeeId || !changeType || toAmount === undefined || !effectiveDate || !reason) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, companyId: session.user.companyId },
  })
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

  const change = await prisma.compensationChange.create({
    data: {
      employeeId,
      changeType,
      description,
      fromAmount: fromAmount ?? null,
      toAmount,
      currency,
      effectiveDate: new Date(effectiveDate),
      reason,
      requestedBy: session.user.name,
      notes,
      status: 'pending',
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'COMPENSATION_CHANGE_REQUESTED',
      resource: 'Employee',
      resourceId: employeeId,
      details: { changeType, fromAmount, toAmount, currency, reason } as never,
    },
  })

  return NextResponse.json({ change }, { status: 201 })
}
