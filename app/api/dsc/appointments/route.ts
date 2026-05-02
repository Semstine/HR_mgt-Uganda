import { NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { requireAuth, canIssueAppointment } from '@/lib/auth'
import { allVerificationsComplete, createAuditEvent } from '@/lib/dsc-workflow'
import { sendSMS } from '@/lib/integrations'

export async function GET(req: Request) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(req.url)
    const cycleId = searchParams.get('cycleId')
    const districtId = searchParams.get('districtId') || session.user.districtId

    const decisions = await withRetry(() =>
      prisma.appointmentDecision.findMany({
        where: {
          cycle: {
            ...(cycleId ? { id: cycleId } : {}),
            ...(districtId ? { districtId } : {}),
          },
        },
        include: {
          cycle: { include: { vacancy: { include: { department: true, staffStructure: true } } } },
          application: { select: { id: true, applicationRef: true, surname: true, firstName: true, phone: true, email: true } },
          letter: true,
          dscMinute: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    )
    return NextResponse.json({ data: decisions })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth()
    if (!canIssueAppointment(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden — only CAO can issue appointment decisions' }, { status: 403 })
    }
    const body = await req.json()

    // Gate: all verifications must be complete
    const ready = await allVerificationsComplete(body.applicationId)
    if (!ready) {
      return NextResponse.json({ error: 'Mandatory credential verifications are not complete' }, { status: 400 })
    }

    const decision = await withRetry(() =>
      prisma.appointmentDecision.create({
        data: {
          cycleId: body.cycleId,
          applicationId: body.applicationId,
          decisionType: body.decisionType || 'appointed',
          dscMinuteId: body.dscMinuteId,
          decidedById: session.user.id,
          effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : undefined,
          notes: body.notes,
        },
      })
    )

    if (body.generateLetter) {
      const letter = await withRetry(() =>
        prisma.appointmentLetter.create({
          data: {
            decisionId: decision.id,
            letterRef: `APT/${new Date().getFullYear()}/${decision.id.slice(-6).toUpperCase()}`,
            templateUsed: body.template || 'standard',
            generatedById: session.user.id,
            acceptanceDeadline: body.acceptanceDeadline ? new Date(body.acceptanceDeadline) : undefined,
          },
        })
      )

      const application = await withRetry(() =>
        prisma.pSCForm3Application.findUnique({ where: { id: body.applicationId } })
      )
      if (application?.phone) {
        await sendSMS(
          application.phone,
          `Dear ${application.firstName}, your appointment letter (${letter.letterRef}) is ready. Please collect it from the DSC office within 14 days. DSC-HRMS`
        )
      }

      await withRetry(() =>
        prisma.pSCForm3Application.update({ where: { id: body.applicationId }, data: { status: 'appointed' } })
      )
    }

    await createAuditEvent({
      entityType: 'AppointmentDecision',
      entityId: decision.id,
      action: 'APPOINTMENT_DECISION_MADE',
      actorId: session.user.id,
      metadata: { applicationId: body.applicationId, decisionType: body.decisionType },
    })

    return NextResponse.json({ data: decision }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
