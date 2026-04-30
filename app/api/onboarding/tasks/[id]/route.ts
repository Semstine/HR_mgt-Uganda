import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recalculateProgress } from '@/lib/onboarding'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { status, notes } = body

  const task = await prisma.employeeOnboardingTask.update({
    where: { id: params.id },
    data: {
      ...(status ? { status } : {}),
      ...(status === 'completed' ? { completedAt: new Date(), completedBy: session.user.name || session.user.email } : {}),
      ...(status === 'pending' ? { completedAt: null, completedBy: null } : {}),
      ...(notes !== undefined ? { notes } : {}),
    },
  })

  // Log the action
  await prisma.onboardingActivityLog.create({
    data: {
      employeeOnboardingId: task.employeeOnboardingId,
      actorId: session.user.id,
      action: status === 'completed' ? 'task_completed' : 'task_updated',
      details: `Task "${task.title}" marked ${status}`,
    },
  })

  // Recalculate overall progress
  await recalculateProgress(task.employeeOnboardingId)

  const updated = await prisma.employeeOnboardingTask.findUnique({ where: { id: params.id } })
  return NextResponse.json({ task: updated })
}
