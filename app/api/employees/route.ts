import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateEmployeeNumber } from '@/lib/utils'
import { DEFAULT_ONBOARDING_TASKS } from '@/types'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')

  const employees = await prisma.employee.findMany({
    where: {
      companyId: session.user.companyId,
      isActive: true,
      ...(q ? {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { jobTitle: { contains: q, mode: 'insensitive' } },
        ],
      } : {}),
    },
    orderBy: { firstName: 'asc' },
    include: { department: { select: { name: true } } },
  })

  return NextResponse.json({ employees })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    firstName, lastName, email, jobTitle, departmentId, employmentType,
    startDate, salary, candidateId, phone, nationality, address,
  } = body

  if (!firstName || !lastName || !email || !jobTitle || !startDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const count = await prisma.employee.count({ where: { companyId: session.user.companyId } })
  const employeeNumber = generateEmployeeNumber(count + 1)

  const employee = await prisma.employee.create({
    data: {
      companyId: session.user.companyId,
      firstName, lastName, email, jobTitle,
      departmentId: departmentId || null,
      employmentType: employmentType || 'FULL_TIME',
      startDate: new Date(startDate),
      salary,
      candidateId: candidateId || null,
      phone, nationality, address,
      employeeNumber,
    },
  })

  await prisma.onboarding.create({
    data: {
      employeeId: employee.id,
      tasks: JSON.stringify(DEFAULT_ONBOARDING_TASKS),
      completedTasks: JSON.stringify([]),
      status: 'pending',
    },
  })

  if (candidateId) {
    await prisma.candidate.update({
      where: { id: candidateId },
      data: { status: 'EMPLOYEE_ACTIVE' },
    })
  }

  return NextResponse.json({ employee }, { status: 201 })
}
