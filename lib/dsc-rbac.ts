import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { DscRole, UserRole } from '@/types'

export const DSC_ROLES: DscRole[] = [
  'NATIONAL_ADMIN_MOPS',
  'DSC_CHAIRPERSON',
  'DSC_MEMBER',
  'SECRETARY_DSC',
  'CAO',
  'DHRO',
  'HOD',
  'COOPTED_TECHNICAL_SPECIALIST',
  'APPLICANT',
  'DISTRICT_RECEPTION_CLERK',
  'CIVIL_SERVICE_COLLEGE',
  'AUDITOR_IGG',
]

export const DISTRICT_SCOPED_ROLES: DscRole[] = DSC_ROLES.filter((role) => role !== 'NATIONAL_ADMIN_MOPS')

export const DSC_PERMISSIONS = {
  MANAGE_REFERENCE_DATA: ['NATIONAL_ADMIN_MOPS'],
  READ_ALL_DISTRICTS: ['NATIONAL_ADMIN_MOPS'],
  DECLARE_VACANCY: ['HOD'],
  REVIEW_ESTABLISHMENT: ['DHRO'],
  SUBMIT_WAGE_CLEARANCE: ['CAO'],
  MANAGE_RECRUITMENT_CYCLE: ['SECRETARY_DSC'],
  APPROVE_DSC_DECISION: ['DSC_CHAIRPERSON'],
  SCORE_SHORTLIST: ['DSC_CHAIRPERSON', 'DSC_MEMBER', 'COOPTED_TECHNICAL_SPECIALIST'],
  SCORE_INTERVIEW: ['DSC_CHAIRPERSON', 'DSC_MEMBER', 'HOD', 'COOPTED_TECHNICAL_SPECIALIST'],
  ISSUE_APPOINTMENT: ['CAO'],
  MANAGE_EMPLOYEE_RECORDS: ['DHRO'],
  SCAN_PAPER_APPLICATIONS: ['DISTRICT_RECEPTION_CLERK'],
  VIEW_AUDIT_LOG: ['NATIONAL_ADMIN_MOPS', 'AUDITOR_IGG'],
} satisfies Record<string, DscRole[]>

export type DscPermission = keyof typeof DSC_PERMISSIONS

export function resolveDscRole(role?: UserRole | string | null, dscRole?: string | null): DscRole | null {
  if (dscRole && DSC_ROLES.includes(dscRole as DscRole)) return dscRole as DscRole
  if (role && DSC_ROLES.includes(role as DscRole)) return role as DscRole
  return null
}

export function hasDscPermission(role: DscRole | null, permission: DscPermission): boolean {
  if (!role) return false
  return (DSC_PERMISSIONS[permission] as readonly DscRole[]).includes(role)
}

export function canAccessDistrict(role: DscRole | null, userDistrictId: string | null | undefined, districtId: string): boolean {
  if (!role) return false
  if (role === 'NATIONAL_ADMIN_MOPS') return true
  return Boolean(userDistrictId && userDistrictId === districtId)
}

export async function getDscSession() {
  const session = await getSession()
  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, dscRole: true, districtId: true, companyId: true },
  })

  if (!user) return null
  const role = resolveDscRole(user.role, user.dscRole)
  if (!role) return null

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    role,
    districtId: user.districtId,
    companyId: user.companyId,
  }
}

export async function requireDscApi(
  req: NextRequest,
  permissions: DscPermission[] = [],
  districtId?: string | null,
) {
  const context = await getDscSession()
  if (!context) {
    return { error: NextResponse.json({ error: 'Unauthorized DSC-HRMS user' }, { status: 401 }) }
  }

  const allowedByPermission = permissions.length === 0 || permissions.some((permission) => hasDscPermission(context.role, permission))
  if (!allowedByPermission) {
    return { error: NextResponse.json({ error: 'Forbidden for DSC role' }, { status: 403 }) }
  }

  if (districtId && !canAccessDistrict(context.role, context.districtId, districtId)) {
    return { error: NextResponse.json({ error: 'District access denied' }, { status: 403 }) }
  }

  return { context }
}

export function scopedDistrictWhere(context: NonNullable<Awaited<ReturnType<typeof getDscSession>>>, districtId?: string | null) {
  if (context.role === 'NATIONAL_ADMIN_MOPS') return districtId ? { districtId } : {}
  return { districtId: context.districtId || '__no_district__' }
}
