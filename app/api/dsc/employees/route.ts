import { NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { createAuditEvent } from '@/lib/dsc-workflow'
import { pushEmployeeToHCM } from '@/lib/integrations'

export async function GET(req: Request) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(req.url)
    const districtId = searchParams.get('districtId') || session.user.districtId
    const status = searchParams.get('status')

    const employees = await withRetry(() =>
      prisma.employeeGovernmentProfile.findMany({
        where: {
          ...(districtId ? { districtId } : {}),
          ...(status ? { employmentStatus: status } : {}),
        },
        include: {
          district: true,
          salaryScale: true,
          probationRecord: true,
          deploymentHistory: { orderBy: { effectiveDate: 'desc' }, take: 1 },
        },
        orderBy: [{ department: 'asc' }, { lastName: 'asc' }],
      })
    )
    return NextResponse.json({ data: employees })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth()
    if (!['DHRO', 'CAO', 'NATIONAL_ADMIN_MOPS', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await req.json()

    const employee = await withRetry(() =>
      prisma.employeeGovernmentProfile.create({
        data: {
          districtId: body.districtId || session.user.districtId!,
          salaryScaleId: body.salaryScaleId,
          employeeNumber: body.employeeNumber,
          nin: body.nin,
          firstName: body.firstName,
          lastName: body.lastName,
          otherNames: body.otherNames,
          gender: body.gender,
          dateOfBirth: new Date(body.dateOfBirth),
          nationality: body.nationality || 'Ugandan',
          phone: body.phone,
          email: body.email,
          postTitle: body.postTitle,
          grade: body.grade,
          department: body.department,
          dutyStation: body.dutyStation,
          reportingOfficer: body.reportingOfficer,
          appointmentDate: body.appointmentDate ? new Date(body.appointmentDate) : new Date(),
          contractType: body.contractType || 'permanent',
        },
        include: { salaryScale: true },
      })
    )

    const hcmResult = await pushEmployeeToHCM({ employee })
    if (hcmResult.success && hcmResult.reference) {
      await withRetry(() =>
        prisma.employeeGovernmentProfile.update({
          where: { id: employee.id },
          data: { hcmEmployeeId: hcmResult.reference },
        })
      )
    }

    await createAuditEvent({
      entityType: 'EmployeeGovernmentProfile',
      entityId: employee.id,
      action: 'EMPLOYEE_RECORD_CREATED',
      actorId: session.user.id,
      districtId: employee.districtId,
      metadata: { employeeNumber: body.employeeNumber, hcmId: hcmResult.reference },
    })

    return NextResponse.json({ data: employee }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
