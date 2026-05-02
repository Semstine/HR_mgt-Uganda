import { NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { requireAuth, canIssueAppointment } from '@/lib/auth'
import { allVerificationsComplete, createAuditEvent } from '@/lib/dsc-workflow'
import { sendSMS } from '@/lib/integrations'

export async function GET(req: Request) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(req.url)
    const recruitmentCycleId = searchParams.get('cycleId')
    const districtId = searchParams.get('districtId') || session.user.districtId

    const decisions = await withRetry(() =>
      prisma.appointmentDecision.findMany({
        where: {
          recruitmentCycle: {
            ...(recruitmentCycleId ? { id: recruitmentCycleId } : {}),
            ...(districtId ? { districtId } : {}),
          },
        },
        include: {
          recruitmentCycle: { include: { vacancyDeclaration: { include: { staffStructure: true } } } },
          application: { select: { id: true, applicationRef: true, firstName: true, lastName: true, phone: true, email: true } },
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
    if (!canIssueAppointment(session.user.role as any)) {
      return NextResponse.json({ error: 'Forbidden — only CAO can issue appointment decisions' }, { status: 403 })
    }
    const body = await req.json()

    const ready = await allVerificationsComplete(body.applicationId)
    if (!ready) {
      return NextResponse.json({ error: 'Mandatory credential verifications are not complete' }, { status: 400 })
    }

    const cycle = await withRetry(() =>
      prisma.recruitmentCycle.findUnique({ where: { id: body.recruitmentCycleId } })
    )
    if (!cycle) return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })

    const decision = await withRetry(() =>
      prisma.appointmentDecision.create({
        data: {
          recruitmentCycleId: body.recruitmentCycleId,
          applicationId: body.applicationId,
          dscDecision: body.dscDecision || 'appointed',
          decisionDate: new Date(),
          minuteRef: body.minuteRef,
          postTitle: body.postTitle || cycle.postTitle,
          grade: body.grade || cycle.grade,
          dutyStation: body.dutyStation || '',
          reportingOfficer: body.reportingOfficer,
          effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : undefined,
          decidedBy: session.user.id,
          notes: body.notes,
        },
      })
    )

    if (body.generateLetter) {
      const acceptanceDeadline = body.acceptanceDeadline
        ? new Date(body.acceptanceDeadline)
        : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

      await withRetry(() =>
        prisma.appointmentLetter.create({
          data: {
            applicationId: body.applicationId,
            letterRef: `APT/${new Date().getFullYear()}/${decision.id.slice(-6).toUpperCase()}`,
            postTitle: body.postTitle || cycle.postTitle,
            grade: body.grade || cycle.grade,
            effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : new Date(),
            dutyStation: body.dutyStation || '',
            acceptanceDeadline,
          },
        })
      )

      const application = await withRetry(() =>
        prisma.pSCForm3Application.findUnique({ where: { id: body.applicationId } })
      )
      if (application?.phone) {
        await sendSMS(
          application.phone,
          `Dear ${application.firstName}, your appointment letter is ready. Collect it from the DSC office within 14 days. DSC-HRMS`
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
      metadata: { applicationId: body.applicationId, dscDecision: body.dscDecision },
    })

    return NextResponse.json({ data: decision }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
