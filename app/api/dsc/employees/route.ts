import { NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { pushEmployeeToHCM, createAuditEvent } from '@/lib/dsc-workflow'

// Re-export from integrations via workflow helper
async function syncHCM(data: any) {
  const { pushEmployeeToHCM: push } = await import('@/lib/integrations')
  return push(data)
}

export async function GET(req: Request) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(req.url)
    const districtId = searchParams.get('districtId') || session.user.districtId
    const departmentId = searchParams.get('departmentId')
    const status = searchParams.get('status')

    const employees = await withRetry(() =>
      prisma.employeeGovernmentProfile.findMany({
        where: {
          ...(districtId ? { districtId } : {}),
          ...(departmentId ? { departmentId } : {}),
          ...(status ? { employmentStatus: status } : {}),
        },
        include: {
          district: true,
          department: true,
          salaryScale: true,
          probationRecords: { orderBy: { startDate: 'desc' }, take: 1 },
          deploymentHistory: { orderBy: { startDate: 'desc' }, take: 1 },
        },
        orderBy: [{ department: { name: 'asc' } }, { surname: 'asc' }],
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
          departmentId: body.departmentId,
          applicationId: body.applicationId,
          fileNumber: body.fileNumber,
          nin: body.nin,
          surname: body.surname,
          firstName: body.firstName,
          otherNames: body.otherNames,
          gender: body.gender,
          dateOfBirth: new Date(body.dateOfBirth),
          nationality: body.nationality || 'Ugandan',
          phone: body.phone,
          email: body.email,
          postTitle: body.postTitle,
          salaryScaleId: body.salaryScaleId,
          step: body.step ?? 1,
          grossSalary: body.grossSalary,
          appointmentDate: body.appointmentDate ? new Date(body.appointmentDate) : new Date(),
          contractType: body.contractType || 'permanent',
        },
        include: { salaryScale: true },
      })
    )

    // Sync to HCM
    const hcmResult = await syncHCM({ employee })
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
      metadata: { fileNumber: body.fileNumber, hcmId: hcmResult.reference },
    })

    return NextResponse.json({ data: employee }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
