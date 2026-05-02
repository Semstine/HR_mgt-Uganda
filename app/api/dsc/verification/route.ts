import { NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { verifyNIN, verifyUNEB, verifyNCHE, verifyTIN } from '@/lib/integrations'
import { createAuditEvent } from '@/lib/dsc-workflow'

export async function GET(req: Request) {
  try {
    await requireAuth()
    const { searchParams } = new URL(req.url)
    const applicationId = searchParams.get('applicationId')
    const cycleId = searchParams.get('cycleId')

    const verifications = await withRetry(() =>
      prisma.credentialVerification.findMany({
        where: {
          ...(applicationId ? { applicationId } : {}),
          ...(cycleId ? { application: { cycleId } } : {}),
        },
        include: {
          application: { select: { id: true, applicationRef: true, surname: true, firstName: true } },
          verifiedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    )
    return NextResponse.json({ data: verifications })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth()
    if (!['SECRETARY_DSC', 'DHRO', 'NATIONAL_ADMIN_MOPS', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await req.json()

    let integrationResult: { success: boolean; reference?: string; data?: any; error?: string } = { success: false }

    // Run integration check based on type
    if (body.verificationType === 'nira_nin') {
      integrationResult = await verifyNIN(body.referenceValue, body.firstName, body.surname)
    } else if (body.verificationType === 'uneb_uce') {
      integrationResult = await verifyUNEB(body.referenceValue, body.yearObtained, 'UCE')
    } else if (body.verificationType === 'nche_degree') {
      integrationResult = await verifyNCHE(body.referenceValue, body.institution)
    } else if (body.verificationType === 'ura_tin') {
      integrationResult = await verifyTIN(body.referenceValue)
    }

    const verification = await withRetry(() =>
      prisma.credentialVerification.create({
        data: {
          applicationId: body.applicationId,
          verificationType: body.verificationType,
          referenceValue: body.referenceValue,
          status: body.waived ? 'waived' : integrationResult.success ? 'verified' : 'failed',
          verifiedById: session.user.id,
          externalReference: integrationResult.reference,
          resultData: integrationResult.data ? JSON.stringify(integrationResult.data) : undefined,
          notes: body.notes || integrationResult.error,
          fraudFlag: body.fraudFlag ?? false,
        },
      })
    )

    await createAuditEvent({
      entityType: 'CredentialVerification',
      entityId: verification.id,
      action: 'CREDENTIAL_VERIFIED',
      actorId: session.user.id,
      metadata: { type: body.verificationType, status: verification.status },
    })

    return NextResponse.json({ data: verification }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
