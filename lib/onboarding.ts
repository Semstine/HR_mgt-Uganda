import { prisma } from '@/lib/prisma'

/**
 * Finds the best-matching OnboardingPath for an employee based on their
 * department, role (jobTitle), and employment type.
 * Priority: most specific match (all 3 fields) → 2 fields → 1 field → any active.
 */
export async function findBestPath(
  companyId: string,
  opts: { department?: string | null; jobTitle?: string | null; employmentType?: string | null }
) {
  const paths = await prisma.onboardingPath.findMany({
    where: { companyId, isActive: true },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  })
  if (!paths.length) return null

  type Scored = { path: typeof paths[0]; score: number }
  const scored: Scored[] = paths.map((p) => {
    let score = 0
    if (p.department && opts.department && p.department.toLowerCase() === opts.department.toLowerCase()) score += 10
    if (p.role && opts.jobTitle && opts.jobTitle.toLowerCase().includes(p.role.toLowerCase())) score += 6
    if (p.employmentType && opts.employmentType && p.employmentType === opts.employmentType) score += 3
    // Generic paths (no specific fields set) score 1 so they beat no match
    if (!p.department && !p.role && !p.employmentType) score += 1
    return { path: p, score }
  })

  scored.sort((a, b) => b.score - a.score)
  const best = scored[0]
  return best.score > 0 ? best.path : null
}

/**
 * Creates an EmployeeOnboarding record and generates tasks from the path's steps.
 * If no path is found, creates a minimal onboarding with default tasks.
 */
export async function assignOnboardingPath(
  employeeId: string,
  companyId: string,
  opts: {
    department?: string | null
    jobTitle?: string | null
    employmentType?: string | null
    startDate?: Date
    assignedBy?: string
    manualPathId?: string
  }
) {
  // Don't create duplicate
  const existing = await prisma.employeeOnboarding.findUnique({ where: { employeeId } })
  if (existing) return existing

  let path = null
  let assignmentReason = 'Default onboarding'

  if (opts.manualPathId) {
    path = await prisma.onboardingPath.findUnique({
      where: { id: opts.manualPathId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    })
    assignmentReason = 'Manually assigned by HR'
  } else {
    path = await findBestPath(companyId, opts)
    if (path) {
      const reasons: string[] = []
      if (path.department) reasons.push(`department: ${path.department}`)
      if (path.role) reasons.push(`role: ${path.role}`)
      if (path.employmentType) reasons.push(`employment type: ${path.employmentType}`)
      assignmentReason = reasons.length ? `Auto-matched on ${reasons.join(', ')}` : 'Default path assigned'
    }
  }

  const baseDate = opts.startDate ?? new Date()

  const onboarding = await prisma.employeeOnboarding.create({
    data: {
      employeeId,
      pathId: path?.id ?? null,
      assignedBy: opts.assignedBy,
      assignmentReason,
      startedAt: baseDate,
      tasks: {
        create: path?.steps.length
          ? path.steps.map((step) => ({
              stepId: step.id,
              title: step.title,
              description: step.description,
              ownerRole: step.ownerRole,
              dueDate: new Date(baseDate.getTime() + step.dueOffsetDays * 86400000),
            }))
          : DEFAULT_TASKS.map((t, i) => ({
              title: t.title,
              description: t.description,
              ownerRole: t.ownerRole,
              dueDate: new Date(baseDate.getTime() + (i + 1) * 86400000),
            })),
      },
    },
  })

  await prisma.onboardingActivityLog.create({
    data: {
      employeeOnboardingId: onboarding.id,
      actorId: opts.assignedBy,
      action: 'path_assigned',
      details: assignmentReason,
    },
  })

  return onboarding
}

/** Recalculates and persists progress % for an EmployeeOnboarding. */
export async function recalculateProgress(employeeOnboardingId: string) {
  const tasks = await prisma.employeeOnboardingTask.findMany({
    where: { employeeOnboardingId },
  })
  if (!tasks.length) return

  const required = tasks.filter((t) => t.status !== 'skipped')
  const done = required.filter((t) => t.status === 'completed')
  const pct = required.length ? Math.round((done.length / required.length) * 100) : 0
  const isComplete = pct === 100

  await prisma.employeeOnboarding.update({
    where: { id: employeeOnboardingId },
    data: {
      progressPercent: pct,
      status: isComplete ? 'completed' : 'in_progress',
      completedAt: isComplete ? new Date() : null,
    },
  })
}

const DEFAULT_TASKS = [
  { title: 'Complete personal information form', description: 'Fill in your personal details in the HR system', ownerRole: 'employee' },
  { title: 'Add emergency contact', description: 'Provide at least one emergency contact', ownerRole: 'employee' },
  { title: 'Sign employment contract', description: 'Review and sign your employment contract', ownerRole: 'employee' },
  { title: 'Submit National ID / Passport copy', description: 'Upload a clear copy of your identification document', ownerRole: 'employee' },
  { title: 'Submit TIN information', description: 'Provide your Tax Identification Number for PAYE', ownerRole: 'employee' },
  { title: 'Submit NSSF information', description: 'Provide your NSSF number or register for one', ownerRole: 'employee' },
  { title: 'Acknowledge HR policy manual', description: 'Read and acknowledge the HR policy manual', ownerRole: 'employee' },
  { title: 'Acknowledge code of conduct', description: 'Read and acknowledge the company code of conduct', ownerRole: 'employee' },
  { title: 'Submit bank details', description: 'Provide your bank account information for payroll', ownerRole: 'employee' },
  { title: 'IT account setup', description: 'HR/IT to create company email and system access', ownerRole: 'it' },
  { title: 'Set 30/60/90-day goals', description: 'Work with your supervisor to set initial performance goals', ownerRole: 'supervisor' },
  { title: 'HR sign-off', description: 'HR Manager to confirm onboarding completion', ownerRole: 'hr' },
]
