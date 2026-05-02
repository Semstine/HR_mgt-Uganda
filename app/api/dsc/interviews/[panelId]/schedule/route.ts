import { NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { sendSMS } from '@/lib/integrations'
import { createAuditEvent } from '@/lib/dsc-workflow'

export async function POST(req: Request, { params }: { params: { panelId: string } }) {
  try {
    const session = await requireAuth()
    if (!['SECRETARY_DSC', 'NATIONAL_ADMIN_MOPS', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await req.json()
    const schedules: any[] = []

    for (const slot of body.slots as Array<{ applicationId: string; scheduledDate: string; scheduledTime?: string; venue?: string; duration?: number }>) {
      const application = await withRetry(() =>
        prisma.pSCForm3Application.findUnique({ where: { id: slot.applicationId } })
      )
      if (!application) continue

      const schedule = await withRetry(() =>
        prisma.interviewSchedule.create({
          data: {
            panelId: params.panelId,
            applicationId: slot.applicationId,
            scheduledDate: new Date(slot.scheduledDate),
            scheduledTime: slot.scheduledTime || '09:00',
            venue: slot.venue || body.venue || 'DSC Boardroom',
            duration: slot.duration ?? 30,
          },
        })
      )
      schedules.push(schedule)

      if (application.phone) {
        const dateStr = new Date(slot.scheduledDate).toLocaleDateString('en-UG')
        await sendSMS(
          application.phone,
          `Dear ${application.firstName}, you are invited for interview on ${dateStr} at ${slot.scheduledTime || '09:00'}. Ref: ${application.applicationRef}. DSC-HRMS`
        )
      }
    }

    await withRetry(() =>
      prisma.pSCForm3Application.updateMany({
        where: { id: { in: body.slots.map((s: any) => s.applicationId) } },
        data: { status: 'invited' },
      })
    )

    await createAuditEvent({
      entityType: 'InterviewPanel',
      entityId: params.panelId,
      action: 'INTERVIEWS_SCHEDULED',
      actorId: session.user.id,
      metadata: { count: schedules.length },
    })

    return NextResponse.json({ data: schedules })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
