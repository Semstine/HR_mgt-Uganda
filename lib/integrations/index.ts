import { prisma } from '../prisma'

export interface IntegrationResult {
  success: boolean
  reference?: string
  data?: Record<string, unknown>
  error?: string
}

async function log(integration: string, direction: 'outbound' | 'inbound', endpoint: string, req: unknown, res: IntegrationResult, ms: number) {
  await prisma.integrationLog.create({
    data: {
      integration, direction, endpoint,
      requestPayload: req as any, responsePayload: res as any,
      statusCode: res.success ? 200 : 500,
      status: res.success ? 'success' : 'failed',
      errorMessage: res.error, duration: ms,
    },
  }).catch(() => {})
}

export async function verifyNIN(nin: string, firstName: string, lastName: string): Promise<IntegrationResult> {
  const t = Date.now()
  const ok = /^(UG-\d{9}-\d{5}|\d{14})$/.test(nin.replace(/\s/g, ''))
  const r: IntegrationResult = ok
    ? { success: true, reference: `NIRA-${t}`, data: { verified: true } }
    : { success: false, error: 'NIN not found or invalid format (mock)' }
  await log('nira', 'outbound', '/verify-nin', { nin, firstName, lastName }, r, Date.now() - t)
  return r
}

export async function verifyUNEB(indexNumber: string, year: string, level: 'UCE' | 'UACE'): Promise<IntegrationResult> {
  const t = Date.now()
  const r: IntegrationResult = { success: true, reference: `UNEB-${t}`, data: { verified: true, level, year } }
  await log('uneb', 'outbound', '/verify-certificate', { indexNumber, year, level }, r, Date.now() - t)
  return r
}

export async function verifyNCHE(studentNumber: string, institution: string): Promise<IntegrationResult> {
  const t = Date.now()
  const r: IntegrationResult = { success: true, reference: `NCHE-${t}`, data: { verified: true, institution } }
  await log('nche', 'outbound', '/verify-degree', { studentNumber, institution }, r, Date.now() - t)
  return r
}

export async function verifyTIN(tin: string): Promise<IntegrationResult> {
  const t = Date.now()
  const r: IntegrationResult = /^\d{10}$/.test(tin)
    ? { success: true, data: { valid: true } }
    : { success: false, error: 'Invalid TIN format (mock)' }
  await log('ura', 'outbound', '/validate-tin', { tin }, r, Date.now() - t)
  return r
}

export async function pushEmployeeToHCM(data: Record<string, unknown>): Promise<IntegrationResult> {
  const t = Date.now()
  const r: IntegrationResult = { success: true, reference: `HCM-${t}`, data: { hcmId: `HCM${Math.random().toString(36).slice(2, 8).toUpperCase()}` } }
  await log('hcm', 'outbound', '/employees', data, r, Date.now() - t)
  return r
}

export async function sendSMS(phone: string, message: string): Promise<IntegrationResult> {
  const t = Date.now()
  const ok = /^(\+256|0)7\d{8}$/.test(phone.replace(/\s/g, ''))
  const r: IntegrationResult = ok
    ? { success: true, reference: `AT-${t}`, data: { messageId: `AT-${t}` } }
    : { success: false, error: 'Invalid Uganda phone number (mock)' }
  await log('africas_talking', 'outbound', '/messaging', { phone, msg: message.slice(0, 20) }, r, Date.now() - t)
  return r
}

export async function handleUSSD(text: string): Promise<string> {
  const parts = text.split('*')
  if (!text) return 'CON Welcome to DSC-HRMS\nEnter your NIN:'
  if (parts.length === 1) return 'CON NIN received.\nEnter Post Reference Number:'
  if (parts.length >= 2) return `END Application registered!\nRef: ${parts[1]}/APP/USSD-${Date.now()}\nYou will receive an SMS confirmation.`
  return 'END Session expired.'
}

export async function publishToPSC(data: Record<string, unknown>): Promise<IntegrationResult> {
  const t = Date.now()
  const r: IntegrationResult = { success: true, reference: `PSC-ADV-${t}`, data: { jobId: `PSC-${t}` } }
  await log('psc', 'outbound', '/vacancies', data, r, Date.now() - t)
  return r
}

export async function submitToMoPS(data: Record<string, unknown>): Promise<IntegrationResult> {
  const t = Date.now()
  const r: IntegrationResult = { success: true, reference: `MOPS-WBC-${t}`, data: { submissionId: `MOPS-${t}` } }
  await log('mops', 'outbound', '/wage-bill-clearance', data, r, Date.now() - t)
  return r
}

export async function signWithUgPass(documentId: string): Promise<IntegrationResult> {
  const t = Date.now()
  const r: IntegrationResult = { success: false, error: 'UgPass not yet available — use manual signature', data: { fallback: 'manual' } }
  await log('ugpass', 'outbound', '/sign', { documentId }, r, Date.now() - t)
  return r
}

export async function enrollCSC(data: Record<string, unknown>): Promise<IntegrationResult> {
  const t = Date.now()
  const r: IntegrationResult = { success: true, reference: `CSC-${t}`, data: { enrollmentId: `CSC-INDUCT-${t}` } }
  await log('csc', 'outbound', '/induction/enroll', data, r, Date.now() - t)
  return r
}

export async function checkIFMS(employeeNumber: string): Promise<IntegrationResult> {
  const t = Date.now()
  const r: IntegrationResult = { success: true, data: { onPayroll: true, employeeNumber } }
  await log('ifms', 'outbound', '/payroll/employee', { employeeNumber }, r, Date.now() - t)
  return r
}
