import { createHash } from 'crypto'
import type { DscRole } from '@/types'

export type DscWorkflowStepDefinition = {
  stepNumber: number
  stepName: string
  actorRole: DscRole
  allowedActions: string[]
  requiredApproval?: DscRole
}

export const DSC_RECRUITMENT_WORKFLOW: DscWorkflowStepDefinition[] = [
  { stepNumber: 1, stepName: 'HoD declares vacancy', actorRole: 'HOD', allowedActions: ['declare_vacancy'] },
  { stepNumber: 2, stepName: 'DHRO consolidates vacancy return', actorRole: 'DHRO', allowedActions: ['consolidate_return'] },
  { stepNumber: 3, stepName: 'CAO submits wage-bill clearance', actorRole: 'CAO', allowedActions: ['submit_wage_bill_clearance'] },
  { stepNumber: 4, stepName: 'Secretary DSC prepares submission to DSC', actorRole: 'SECRETARY_DSC', allowedActions: ['prepare_dsc_submission'] },
  { stepNumber: 5, stepName: 'DSC sits and authorizes advertisement', actorRole: 'DSC_CHAIRPERSON', allowedActions: ['authorize_advert'], requiredApproval: 'DSC_CHAIRPERSON' },
  { stepNumber: 6, stepName: 'Advert published across channels', actorRole: 'SECRETARY_DSC', allowedActions: ['publish_advert'] },
  { stepNumber: 7, stepName: 'Applications received through online, USSD, or paper', actorRole: 'SECRETARY_DSC', allowedActions: ['open_intake', 'receive_application'] },
  { stepNumber: 8, stepName: 'Application register compiled and closed', actorRole: 'SECRETARY_DSC', allowedActions: ['close_register'] },
  { stepNumber: 9, stepName: 'Shortlisting committee scores applications', actorRole: 'DSC_MEMBER', allowedActions: ['submit_shortlisting_scores'] },
  { stepNumber: 10, stepName: 'Shortlist published and candidates notified', actorRole: 'DSC_CHAIRPERSON', allowedActions: ['approve_shortlist'], requiredApproval: 'DSC_CHAIRPERSON' },
  { stepNumber: 11, stepName: 'Interview panel constituted and scheduled', actorRole: 'SECRETARY_DSC', allowedActions: ['schedule_interviews'] },
  { stepNumber: 12, stepName: 'Interviews/written tests conducted and scored', actorRole: 'DSC_MEMBER', allowedActions: ['submit_interview_scores'] },
  { stepNumber: 13, stepName: 'Reference and credential verification completed', actorRole: 'SECRETARY_DSC', allowedActions: ['complete_verification'] },
  { stepNumber: 14, stepName: 'DSC makes appointment decision', actorRole: 'DSC_CHAIRPERSON', allowedActions: ['record_appointment_decision'], requiredApproval: 'DSC_CHAIRPERSON' },
  { stepNumber: 15, stepName: 'CAO issues appointment letter', actorRole: 'CAO', allowedActions: ['issue_appointment_letter'] },
  { stepNumber: 16, stepName: 'Onboarding, oath, and HCM record creation', actorRole: 'DHRO', allowedActions: ['complete_onboarding'] },
  { stepNumber: 17, stepName: 'Probation tracked and confirmation processed', actorRole: 'HOD', allowedActions: ['process_probation_confirmation'] },
]

export function getWorkflowStep(stepNumber: number) {
  return DSC_RECRUITMENT_WORKFLOW.find((step) => step.stepNumber === stepNumber)
}

export function canActOnStep(role: DscRole, stepNumber: number) {
  const step = getWorkflowStep(stepNumber)
  if (!step) return false
  if (role === 'NATIONAL_ADMIN_MOPS' || role === 'AUDITOR_IGG') return false
  if (role === step.actorRole) return true
  if (step.actorRole === 'DSC_MEMBER' && ['DSC_CHAIRPERSON', 'DSC_MEMBER', 'COOPTED_TECHNICAL_SPECIALIST'].includes(role)) return true
  return step.requiredApproval === role
}

export function recruitmentStatusForStep(stepNumber: number) {
  const key = getWorkflowStep(stepNumber)?.stepName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  return key ? `step_${stepNumber}_${key}` : 'completed'
}

export function stateHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value ?? {})).digest('hex')
}

export async function createImmutableAuditEvent(params: {
  prisma: any
  districtId?: string | null
  recruitmentCycleId?: string | null
  actorId: string
  actorRole: string
  action: string
  entityType: string
  entityId: string
  beforeState?: unknown
  afterState?: unknown
  ipAddress?: string | null
  metadata?: unknown
}) {
  return params.prisma.immutableAuditEvent.create({
    data: {
      districtId: params.districtId || null,
      recruitmentCycleId: params.recruitmentCycleId || null,
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      beforeStateHash: params.beforeState ? stateHash(params.beforeState) : null,
      afterStateHash: params.afterState ? stateHash(params.afterState) : null,
      ipAddress: params.ipAddress || null,
      metadata: params.metadata ?? undefined,
    },
  })
}
