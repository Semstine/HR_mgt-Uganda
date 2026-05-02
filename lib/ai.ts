import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-6'

function parseJson<T>(text: string): T {
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
  if (!match) throw new Error('AI did not return valid JSON')
  return JSON.parse(match[0]) as T
}

// ─── Job generation ───────────────────────────────────────────────────────────

export async function generateJobDescription(params: {
  title: string
  department?: string
  industry: string
  experienceLevel?: string
  location?: string
  companyContext?: string
}): Promise<{
  description: string
  responsibilities: string
  requiredSkills: string[]
  preferredSkills: string[]
  education: string
  screeningKeywords: string[]
  interviewQuestions: string[]
}> {
  const prompt = `You are an expert HR professional in East Africa (Uganda/Kenya). Generate a professional job description.

Role: ${params.title}
Industry: ${params.industry}
Department: ${params.department || 'General'}
Experience: ${params.experienceLevel || 'Mid-level'}
Location: ${params.location || 'Kampala, Uganda'}
${params.companyContext ? `Company context: ${params.companyContext}` : ''}

Return JSON only:
{
  "description": "2-3 paragraph job overview",
  "responsibilities": "bullet list of 6-8 responsibilities starting with •",
  "requiredSkills": ["skill1", ...] (8-10 items),
  "preferredSkills": ["skill1", ...] (4-6 items),
  "education": "education requirements",
  "screeningKeywords": ["keyword1", ...] (10-15 keywords),
  "interviewQuestions": ["question1", ...] (8-10 questions)
}`

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = resp.content[0].type === 'text' ? resp.content[0].text : ''
  return parseJson(text)
}

// ─── Resume screening ─────────────────────────────────────────────────────────

export async function screenResume(params: {
  resumeText: string
  jobTitle: string
  requiredSkills: string[]
  preferredSkills: string[]
  experienceLevel?: string
  education?: string
  screeningKeywords: string[]
}): Promise<{
  score: number
  breakdown: { skills: number; experience: number; education: number; keywords: number }
  strengths: string[]
  gaps: string[]
  recommendation: 'shortlist' | 'review' | 'reject'
  explanation: string
  extractedData: {
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
}> {
  const prompt = `You are an expert HR recruiter in East Africa. Screen this resume for the ${params.jobTitle} position.

Job Requirements:
- Required skills: ${params.requiredSkills.join(', ')}
- Preferred skills: ${params.preferredSkills.join(', ')}
- Experience level: ${params.experienceLevel || 'Not specified'}
- Education: ${params.education || 'Not specified'}
- Screening keywords: ${params.screeningKeywords.join(', ')}

Resume:
${params.resumeText.substring(0, 5000)}

Score 0-100 and return JSON:
{
  "score": 75,
  "breakdown": { "skills": 80, "experience": 70, "education": 75, "keywords": 80 },
  "strengths": ["strength1", "strength2"],
  "gaps": ["gap1", "gap2"],
  "recommendation": "shortlist|review|reject",
  "explanation": "2-3 sentence explanation",
  "extractedData": {
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "+256...",
    "location": "City, Country",
    "education": "Highest qualification",
    "experience": "X years summary",
    "skills": ["skill1", "skill2"],
    "jobTitles": ["title1", "title2"],
    "employers": ["employer1", "employer2"],
    "certifications": ["cert1"],
    "yearsOfExperience": 5
  }
}

Scoring: 80+ = shortlist, 50-79 = review, <50 = reject.`

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = resp.content[0].type === 'text' ? resp.content[0].text : ''
  return parseJson(text)
}

// ─── Company research + org design ───────────────────────────────────────────

export async function generateCompanySuggestions(company: {
  name: string
  industry: string
  productsServices?: string
  size?: string
  location?: string
  website?: string
  currentHrProcess?: string
}): Promise<{
  suggestedRoles: string[]
  departmentStructure: { name: string; roles: string[]; headcount: number }[]
  hiringPriorities: string[]
  hrWorkflows: string[]
  jobDescriptionTemplates: { title: string; department: string; summary: string }[]
  screeningKeywordSets: { role: string; keywords: string[] }[]
  interviewQuestionSets: { role: string; questions: string[] }[]
  complianceReminders: string[]
  insights: string
}> {
  const prompt = `You are an HR consultant specialising in East African businesses. Based on this company profile, provide comprehensive HR setup recommendations.

Company:
- Name: ${company.name}
- Industry: ${company.industry}
- Products/Services: ${company.productsServices || 'Not specified'}
- Size: ${company.size || 'Not specified'}
- Location: ${company.location || 'Uganda'}
- Website: ${company.website || 'Not provided'}
- Current HR: ${company.currentHrProcess || 'Manual/paper-based'}

Return JSON with practical recommendations. Tailor everything to the East African (especially Ugandan) business context, labour law, and culture:
{
  "suggestedRoles": ["Role 1", ...] (10-14 likely roles),
  "departmentStructure": [
    {"name": "Department", "roles": ["Role1", "Role2"], "headcount": 5}
  ] (realistic departments for this company type),
  "hiringPriorities": ["Priority 1", ...] (5-7 immediate hiring needs with rationale),
  "hrWorkflows": ["Workflow 1", ...] (5-7 recommended processes),
  "jobDescriptionTemplates": [
    {"title": "Role Title", "department": "Dept", "summary": "1-sentence summary"}
  ] (4-6 top priority roles),
  "screeningKeywordSets": [
    {"role": "Role", "keywords": ["kw1", "kw2"]}
  ] (for top 4 roles),
  "interviewQuestionSets": [
    {"role": "Role", "questions": ["Q1", "Q2", "Q3"]}
  ] (3-5 questions per top 3 roles),
  "complianceReminders": ["Reminder 1", ...] (Uganda-specific: NSSF, PAYE, contracts, etc.),
  "insights": "2-3 paragraph strategic HR insight for this specific company"
}`

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = resp.content[0].type === 'text' ? resp.content[0].text : ''
  return parseJson(text)
}

// ─── Email templates ──────────────────────────────────────────────────────────

export type EmailTemplateType =
  | 'application_received'
  | 'rejected'
  | 'phone_interview'
  | 'interview_scheduled'
  | 'interview_reminder'
  | 'offer'
  | 'onboarding'

const EMAIL_TYPE_CONTEXT: Record<EmailTemplateType, string> = {
  application_received: 'acknowledge receipt, set expectations for timeline',
  rejected: 'politely decline with encouragement, keep the door open',
  phone_interview: 'invite for phone/video screening, include scheduling instructions',
  interview_scheduled: 'confirm interview date/time/location or link, what to bring',
  interview_reminder: 'friendly reminder of upcoming interview tomorrow, what to prepare',
  offer: 'extend a job offer, highlight key terms, instructions to accept',
  onboarding: 'welcome to the team, first day instructions, what to expect',
}

export async function generateEmailTemplate(params: {
  type: EmailTemplateType | string
  candidateName: string
  jobTitle: string
  companyName: string
  additionalContext?: string
}): Promise<{ subject: string; body: string }> {
  const context = EMAIL_TYPE_CONTEXT[params.type as EmailTemplateType] || params.type
  const prompt = `Write a professional, warm HR email for an East African company.

Type: ${context}
Candidate: ${params.candidateName}
Position: ${params.jobTitle}
Company: ${params.companyName}
${params.additionalContext ? `Extra context: ${params.additionalContext}` : ''}

Return JSON:
{"subject": "Email subject", "body": "Full email with greeting and [HR Name] signature placeholder"}

Keep it professional, warm, and appropriate for East African business culture.`

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = resp.content[0].type === 'text' ? resp.content[0].text : ''
  return parseJson(text)
}

// ─── Performance summary ──────────────────────────────────────────────────────

export async function generatePerformanceSummary(params: {
  employeeName: string
  jobTitle: string
  selfEvaluation: Record<string, unknown>
  supervisorEvaluation: Record<string, unknown>
  period: string
}): Promise<{ summary: string; recommendations: string; nextSteps: string }> {
  const prompt = `Summarise this performance review for an East African company.

Employee: ${params.employeeName} — ${params.jobTitle}
Period: ${params.period}
Self-evaluation: ${JSON.stringify(params.selfEvaluation)}
Supervisor evaluation: ${JSON.stringify(params.supervisorEvaluation)}

Return JSON:
{
  "summary": "Balanced 2-3 paragraph summary",
  "recommendations": "Specific development recommendations",
  "nextSteps": "Concrete next steps for employee and manager"
}`

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = resp.content[0].type === 'text' ? resp.content[0].text : ''
  return parseJson(text)
}

// ─── Onboarding AI ───────────────────────────────────────────────────────────

export async function recommendOnboardingPath(params: {
  paths: { id: string; name: string; department?: string | null; role?: string | null; employmentType?: string | null; durationDays: number; steps: number }[]
  employee: { jobTitle: string; department?: string; employmentType: string; startDate: string }
}): Promise<{
  recommendedPathId: string
  confidence: 'high' | 'medium' | 'low'
  reason: string
  alternatives: { pathId: string; reason: string }[]
  tips: string[]
}> {
  const prompt = `You are an HR onboarding specialist for an East African company. Recommend the best onboarding path for this new employee.

Available Onboarding Paths:
${params.paths.map((p, i) =>
  `${i + 1}. ID: ${p.id} | Name: "${p.name}" | Dept: ${p.department ?? 'Any'} | Role keyword: ${p.role ?? 'Any'} | Employment: ${p.employmentType ?? 'Any'} | Duration: ${p.durationDays} days | Steps: ${p.steps}`
).join('\n')}

New Employee:
- Job title: ${params.employee.jobTitle}
- Department: ${params.employee.department ?? 'Unknown'}
- Employment type: ${params.employee.employmentType}
- Start date: ${params.employee.startDate}

Pick the BEST match and explain why. Return JSON:
{
  "recommendedPathId": "the-path-id",
  "confidence": "high|medium|low",
  "reason": "2-3 sentence explanation of why this is the best match",
  "alternatives": [{"pathId": "id", "reason": "brief reason"}],
  "tips": ["Onboarding tip specific to this role/context", "..."] (2-3 tips)
}`

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = resp.content[0].type === 'text' ? resp.content[0].text : ''
  return parseJson(text)
}

export async function generateOnboardingSteps(params: {
  pathName: string
  department?: string
  role?: string
  employmentType?: string
  durationDays: number
  companyName: string
}): Promise<{
  steps: {
    title: string
    description: string
    ownerRole: 'employee' | 'hr' | 'supervisor' | 'it' | 'finance'
    dueOffsetDays: number
    isRequired: boolean
  }[]
  notes: string
}> {
  const prompt = `You are an HR specialist designing an employee onboarding plan for an East African company.

Company: ${params.companyName}
Onboarding Path: "${params.pathName}"
Department: ${params.department ?? 'General'}
Role type: ${params.role ?? 'General staff'}
Employment type: ${params.employmentType ?? 'FULL_TIME'}
Total duration: ${params.durationDays} days

Create a complete, ordered set of onboarding steps appropriate for this role. Include Uganda-specific compliance steps (NSSF, TIN, PAYE, employment contract).

Owner roles: "employee" (employee does it), "hr" (HR team), "supervisor" (line manager), "it" (IT team), "finance" (finance/payroll).

Return JSON:
{
  "steps": [
    {
      "title": "Step title",
      "description": "What exactly needs to be done",
      "ownerRole": "employee|hr|supervisor|it|finance",
      "dueOffsetDays": 1,
      "isRequired": true
    }
  ],
  "notes": "Brief note on this onboarding plan"
}

Generate 8-12 steps spanning from Day 1 to Day ${params.durationDays}. Make dueOffsetDays realistic and progressive.`

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = resp.content[0].type === 'text' ? resp.content[0].text : ''
  return parseJson(text)
}

export async function summarizeOnboardingProgress(params: {
  employee: { name: string; jobTitle: string; department?: string; startDate: string }
  path?: string
  progressPercent: number
  tasks: { title: string; status: string; ownerRole: string; dueDate?: string; overdue: boolean }[]
  startedAt: string
}): Promise<{
  summary: string
  bottleneck: string
  hrActions: string[]
  employeeActions: string[]
  supervisorActions: string[]
  riskLevel: 'low' | 'medium' | 'high'
  estimatedCompletion: string
}> {
  const overdue = params.tasks.filter(t => t.overdue)
  const pending = params.tasks.filter(t => t.status === 'pending')
  const completed = params.tasks.filter(t => t.status === 'completed')

  const prompt = `You are an HR onboarding analyst. Analyse this employee's onboarding progress and provide actionable insights.

Employee: ${params.employee.name} — ${params.employee.jobTitle} (${params.employee.department ?? 'Unknown dept'})
Start date: ${params.employee.startDate}
Onboarding path: ${params.path ?? 'Default'}
Progress: ${params.progressPercent}% complete
Onboarding started: ${params.startedAt}

Tasks:
- Completed (${completed.length}): ${completed.map(t => t.title).join(', ') || 'None'}
- Pending (${pending.length}): ${pending.map(t => `"${t.title}" [${t.ownerRole}]`).join(', ') || 'None'}
- OVERDUE (${overdue.length}): ${overdue.map(t => `"${t.title}" [${t.ownerRole}]`).join(', ') || 'None'}

Analyse the situation and return JSON:
{
  "summary": "2-3 sentence overall summary of where this employee stands in onboarding",
  "bottleneck": "What is the main blocker or risk right now (1-2 sentences)",
  "hrActions": ["Specific action HR should take now", "..."] (2-3 items),
  "employeeActions": ["What the employee needs to do", "..."] (1-3 items),
  "supervisorActions": ["What the supervisor should do", "..."] (1-2 items),
  "riskLevel": "low|medium|high",
  "estimatedCompletion": "Realistic completion estimate e.g. 'On track - 5 days', 'Delayed by ~1 week'"
}`

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = resp.content[0].type === 'text' ? resp.content[0].text : ''
  return parseJson(text)
}

export async function suggestOnboardingMaterials(params: {
  stepTitle: string
  stepDescription?: string
  pathName: string
  department?: string
  role?: string
  existingMaterials: { title: string; category: string }[]
}): Promise<{
  suggestions: {
    title: string
    description: string
    category: string
    isRequired: boolean
    reason: string
  }[]
  note: string
}> {
  const prompt = `You are an HR onboarding specialist. Suggest onboarding materials for this step in an East African company's onboarding process.

Onboarding Path: "${params.pathName}"
Department: ${params.department ?? 'General'}
Role: ${params.role ?? 'General staff'}
Step: "${params.stepTitle}"
Step description: ${params.stepDescription ?? 'Not provided'}

Existing materials in library (to avoid duplicates):
${params.existingMaterials.map(m => `- ${m.title} [${m.category}]`).join('\n') || 'None yet'}

Material categories available: welcome, contract, policy, it, training, payroll, compliance, role_specific, orientation, general

Suggest 3-5 specific, practical materials that should be attached to this step. For Uganda context, consider NSSF, PAYE, TIN, Employment Act requirements where relevant.

Return JSON:
{
  "suggestions": [
    {
      "title": "Material name",
      "description": "What this document contains",
      "category": "category-name",
      "isRequired": true,
      "reason": "Why this material is needed for this step"
    }
  ],
  "note": "Brief tip about materials for this step"
}`

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = resp.content[0].type === 'text' ? resp.content[0].text : ''
  return parseJson(text)
}

// ─── HR assistant ─────────────────────────────────────────────────────────────

export async function askHRAssistant(params: {
  question: string
  context: string
}): Promise<{ answer: string; suggestions?: string[] }> {
  const prompt = `You are TalentBridge AI, an HR assistant for East African companies. Answer the HR question using the provided company context.

Context:
${params.context}

Question: ${params.question}

Rules:
- Never make final hiring, firing, or promotion decisions
- Provide factual answers based on the data
- Flag compliance concerns (Uganda: NSSF, PAYE, Employment Act)
- Suggest concrete next steps for HR

Return JSON:
{
  "answer": "Direct, helpful answer",
  "suggestions": ["Action 1", "Action 2"]
}`

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = resp.content[0].type === 'text' ? resp.content[0].text : ''
  try {
    return parseJson(text)
  } catch {
    return { answer: text }
  }
}
