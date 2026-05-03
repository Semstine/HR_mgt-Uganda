import { NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { advanceStep, createAuditEvent } from '@/lib/dsc-workflow'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth()
    const cycle = await withRetry(() =>
      prisma.recruitmentCycle.findUnique({
        where: { id: params.id },
        include: {
          district: true,
          vacancyDeclaration: true,
          workflowSteps: { orderBy: { stepNumber: 'asc' } },
          advert: true,
          applications: {
            include: { shortlistingScores: true },
            orderBy: { submittedAt: 'asc' },
          },
          shortlistingPanel: { include: { panelMembers: true } },
          interviewPanel: { include: { panelMembers: true, schedules: true } },
          appointmentDecisions: true,
        },
      })
    )
    if (!cycle) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ data: cycle })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth()
    const body = await req.json()

    if (body.action === 'advance_step') {
      const step = await advanceStep(params.id, session.user.id, session.user.role, body.notes)
      return NextResponse.json({ data: step })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
