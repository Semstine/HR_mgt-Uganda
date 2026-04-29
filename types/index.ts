export type UserRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'HR_MANAGER' | 'HR_OFFICER' | 'DEPARTMENT_MANAGER' | 'SUPERVISOR' | 'EMPLOYEE' | 'CANDIDATE'
export type JobStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED'
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'CONSULTANT'
export type CandidateStatus = 'RECEIVED' | 'UNDER_REVIEW' | 'SHORTLISTED' | 'REJECTED' | 'PHONE_INTERVIEW_INVITED' | 'INTERVIEW_SCHEDULED' | 'FINAL_INTERVIEW' | 'OFFER_SENT' | 'OFFER_ACCEPTED' | 'ONBOARDING' | 'EMPLOYEE_ACTIVE' | 'ARCHIVED'
export type ReviewCycle = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL'
export type ReviewStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
export type CaseType = 'COMPLAINT' | 'DISCIPLINARY' | 'WARNING' | 'PERFORMANCE_IMPROVEMENT' | 'CONFLICT_RESOLUTION' | 'TERMINATION'
export type CaseStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
export type EmailCommStatus = 'draft' | 'pending_approval' | 'approved' | 'sent' | 'failed'
export type OfferStatus = 'draft' | 'pending_hr_approval' | 'approved' | 'sent' | 'signed' | 'declined' | 'expired'
export type CompensationChangeType = 'salary' | 'allowance' | 'benefit' | 'deduction'
export type ComplianceType = 'nssf' | 'paye' | 'leave_policy' | 'contract' | 'work_permit' | 'disciplinary' | 'probation'
export type ContractType = 'permanent' | 'fixed_term' | 'casual' | 'probationary'
export type StorageProvider = 'local' | 's3' | 'supabase' | 'cloudinary'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: UserRole
  companyId: string | null
}

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

export interface KpiCard {
  title: string
  value: string | number
  change?: string
  changeType?: 'increase' | 'decrease' | 'neutral'
}

export interface AnalyticsData {
  totalEmployees: number
  openPositions: number
  activeCandidates: number
  pendingReviews: number
  timeToHire: number
  turnoverRate: number
  headcountByDepartment: { department: string; count: number }[]
  hiringFunnel: { stage: string; count: number }[]
  recentHires: number
  onboardingInProgress: number
  // Enhanced analytics
  candidatesBySource: { source: string; count: number }[]
  applicantsPerRole: { role: string; count: number }[]
  rejectionReasons: { reason: string; count: number }[]
  offerAcceptanceRate: number
  interviewCompletionRate: number
  avgScreeningScore: number
  leaveByType: { type: string; days: number }[]
  performanceScoreTrend: { period: string; avg: number }[]
  reviewCompletionRate: number
  promotionPipeline: number
}

export interface AIScreeningResult {
  score: number
  breakdown: { skills: number; experience: number; education: number; keywords: number }
  strengths: string[]
  gaps: string[]
  recommendation: 'shortlist' | 'review' | 'reject'
  explanation: string
  extractedData?: {
    name?: string
    email?: string
    phone?: string
    location?: string
    education?: string
    experience?: string
    skills?: string[]
    jobTitles?: string[]
    employers?: string[]
    certifications?: string[]
    yearsOfExperience?: number
  }
}

export interface EmailTemplate {
  subject: string
  body: string
}

export interface OnboardingTask {
  id: string
  title: string
  description: string
  category: string
  required: boolean
  completed: boolean
}

export interface CompensationAllowance {
  name: string
  amount: number
  frequency: 'monthly' | 'annual' | 'one-time'
  taxable: boolean
}

export interface PayrollExportRow {
  employeeNumber: string
  fullName: string
  jobTitle: string
  department: string
  grossSalary: number
  nssfEmployee: number
  nssfEmployer: number
  paye: number
  otherDeductions: number
  netSalary: number
  bankAccount: string
  bankName: string
  currency: string
}

export const CANDIDATE_STATUS_LABELS: Record<CandidateStatus, string> = {
  RECEIVED: 'Received',
  UNDER_REVIEW: 'Under Review',
  SHORTLISTED: 'Shortlisted',
  REJECTED: 'Rejected',
  PHONE_INTERVIEW_INVITED: 'Phone Interview Invited',
  INTERVIEW_SCHEDULED: 'Interview Scheduled',
  FINAL_INTERVIEW: 'Final Interview',
  OFFER_SENT: 'Offer Sent',
  OFFER_ACCEPTED: 'Offer Accepted',
  ONBOARDING: 'Onboarding',
  EMPLOYEE_ACTIVE: 'Employee Active',
  ARCHIVED: 'Archived',
}

export const CANDIDATE_STATUS_COLORS: Record<CandidateStatus, string> = {
  RECEIVED: 'bg-gray-100 text-gray-700',
  UNDER_REVIEW: 'bg-blue-100 text-blue-700',
  SHORTLISTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  PHONE_INTERVIEW_INVITED: 'bg-purple-100 text-purple-700',
  INTERVIEW_SCHEDULED: 'bg-indigo-100 text-indigo-700',
  FINAL_INTERVIEW: 'bg-violet-100 text-violet-700',
  OFFER_SENT: 'bg-orange-100 text-orange-700',
  OFFER_ACCEPTED: 'bg-emerald-100 text-emerald-700',
  ONBOARDING: 'bg-teal-100 text-teal-700',
  EMPLOYEE_ACTIVE: 'bg-green-100 text-green-800',
  ARCHIVED: 'bg-gray-100 text-gray-500',
}

export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  CLOSED: 'bg-red-100 text-red-700',
}

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: 'Full Time',
  PART_TIME: 'Part Time',
  CONTRACT: 'Contract',
  INTERNSHIP: 'Internship',
  CONSULTANT: 'Consultant',
}

export const EMAIL_COMM_STATUS_LABELS: Record<EmailCommStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  sent: 'Sent',
  failed: 'Failed',
}

export const EMAIL_COMM_STATUS_COLORS: Record<EmailCommStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending_approval: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  sent: 'bg-blue-100 text-blue-700',
  failed: 'bg-red-100 text-red-700',
}

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  draft: 'Draft',
  pending_hr_approval: 'Pending HR Approval',
  approved: 'Approved',
  sent: 'Sent to Candidate',
  signed: 'Signed',
  declined: 'Declined',
  expired: 'Expired',
}

export const COMPLIANCE_TYPE_LABELS: Record<ComplianceType, string> = {
  nssf: 'NSSF',
  paye: 'PAYE / TIN',
  leave_policy: 'Leave Policy',
  contract: 'Employment Contract',
  work_permit: 'Work Permit',
  disciplinary: 'Disciplinary Record',
  probation: 'Probation',
}

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  permanent: 'Permanent',
  fixed_term: 'Fixed Term',
  casual: 'Casual / Daily',
  probationary: 'Probationary',
}

export const DEFAULT_ONBOARDING_TASKS: OnboardingTask[] = [
  { id: 'personal_info', title: 'Personal Information Form', description: 'Complete personal details, contact info, and next of kin', category: 'Documentation', required: true, completed: false },
  { id: 'emergency_contact', title: 'Emergency Contact', description: 'Provide emergency contact details', category: 'Documentation', required: true, completed: false },
  { id: 'bank_details', title: 'Bank / Payment Details', description: 'Submit bank account for salary payment', category: 'Finance', required: true, completed: false },
  { id: 'tax_info', title: 'Tax Information (TIN/PAYE)', description: 'Provide Tax Identification Number', category: 'Finance', required: true, completed: false },
  { id: 'nssf', title: 'NSSF Registration', description: 'Submit NSSF number or register if new', category: 'Finance', required: true, completed: false },
  { id: 'contract_sign', title: 'Sign Employment Contract', description: 'Review and sign your employment contract', category: 'Legal', required: true, completed: false },
  { id: 'policies', title: 'HR Policy Acknowledgement', description: 'Read and acknowledge company HR policies', category: 'Legal', required: true, completed: false },
  { id: 'id_documents', title: 'Submit ID Documents', description: 'Upload national ID, passport, or other identification', category: 'Documentation', required: true, completed: false },
  { id: 'orientation', title: 'Company Orientation', description: 'Complete company orientation session', category: 'Orientation', required: false, completed: false },
  { id: 'it_setup', title: 'IT Equipment & Access', description: 'Set up company email, systems and access', category: 'IT', required: false, completed: false },
  { id: 'meet_team', title: 'Meet the Team', description: 'Introduction to your department and key colleagues', category: 'Orientation', required: false, completed: false },
  { id: 'first_week', title: 'First Week Tasks', description: 'Complete first week assignment from your supervisor', category: 'Work', required: false, completed: false },
]
