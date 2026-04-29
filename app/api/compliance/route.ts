import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const employeeId = searchParams.get('employeeId')
  const status = searchParams.get('status')

  const records = await prisma.complianceRecord.findMany({
    where: {
      companyId: session.user.companyId,
      ...(type ? { type } : {}),
      ...(employeeId ? { employeeId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      employee: { select: { firstName: true, lastName: true, jobTitle: true, employeeNumber: true } },
    },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
  })

  // Summary counts
  const overdue = records.filter((r) => r.status === 'overdue').length
  const pending = records.filter((r) => r.status === 'pending').length
  const compliant = records.filter((r) => r.status === 'compliant').length

  return NextResponse.json({ records, summary: { overdue, pending, compliant, total: records.length } })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { employeeId, type, title, description, dueDate, data, notes } = body

  if (!type || !title) return NextResponse.json({ error: 'type and title required' }, { status: 400 })

  const record = await prisma.complianceRecord.create({
    data: {
      companyId: session.user.companyId,
      employeeId: employeeId || null,
      type,
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : null,
      data: data || null,
      notes,
      status: 'pending',
    },
  })

  return NextResponse.json({ record }, { status: 201 })
}
