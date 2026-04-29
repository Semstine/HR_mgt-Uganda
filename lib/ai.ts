import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL = 'claude-sonnet-4-6'

export async function generateJobDescription(params: {
  title: string
  department?: string
  industry: string
  experienceLevel?: string
  location?: string
}): Promise<{
  description: string
  responsibilities: string
  requiredSkills: string[]
  preferredSkills: string[]
  education: string
  screeningKeywords: string[]
  interviewQuestions: string[]
}> {
  const prompt = `You are an expert HR professional in East Africa (Uganda/Kenya). Generate a professional job description for a ${params.title} role.

Company context:
- Industry: ${params.industry}
- Department: ${params.department || 'General'}
- Experience level: ${params.experienceLevel || 'Mid-level'}
- Location: ${params.location || 'Kampala, Uganda'}

Return a JSON object with exactly these fields:
{
  "description": "2-3 paragraph job overview",
  "responsibilities": "bullet-point list of 6-8 key responsibilities",
  "requiredSkills": ["skill1", "skill2", ...] (8-10 items),
  "preferredSkills": ["skill1", "skill2", ...] (4-6 items),
  "education": "education requirements paragraph",
  "screeningKeywords": ["keyword1", ...] (10-15 resume screening keywords),
  "interviewQuestions": ["question1", ...] (8-10 interview questions)
}

Keep language professional, inclusive, and appropriate for East African job market. Return only valid JSON.`

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI did not return valid JSON')
  return JSON.parse(jsonMatch[0])
}

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
${params.resumeText.substring(0, 4000)}

Score the candidate 0-100 and return JSON:
{
  "score": 75,
  "breakdown": {
    "skills": 80,
    "experience": 70,
    "education": 75,
    "keywords": 80
  },
  "strengths": ["strength1", "strength2"],
  "gaps": ["gap1", "gap2"],
  "recommendation": "shortlist|review|reject",
  "explanation": "2-3 sentence explanation of the score and recommendation",
  "extractedData": {
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "+256...",
    "location": "City, Country",
    "education": "Highest qualification",
    "experience": "X years in Y field",
    "skills": ["skill1", "skill2"]
  }
}

Score guide: 80+ = shortlist, 50-79 = review, <50 = reject. Return only valid JSON.`

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI did not return valid JSON')
  return JSON.parse(jsonMatch[0])
}

export async function generateCompanySuggestions(company: {
  name: string
  industry: string
  productsServices?: string
  size?: string
  location?: string
  currentHrProcess?: string
}): Promise<{
  suggestedRoles: string[]
  departmentStructure: { name: string; roles: string[] }[]
  hiringPriorities: string[]
  hrWorkflows: string[]
  insights: string
}> {
  const prompt = `You are an HR consultant specializing in East African businesses. Based on this company profile, provide HR setup recommendations.

Company:
- Name: ${company.name}
- Industry: ${company.industry}
- Products/Services: ${company.productsServices || 'Not specified'}
- Size: ${company.size || 'Not specified'}
- Location: ${company.location || 'Uganda'}
- Current HR process: ${company.currentHrProcess || 'Manual/paper-based'}

Return JSON with practical recommendations for a ${company.location || 'Ugandan'} company:
{
  "suggestedRoles": ["Role 1", "Role 2", ...] (8-12 likely needed roles),
  "departmentStructure": [
    {"name": "Department Name", "roles": ["Role 1", "Role 2"]}
  ],
  "hiringPriorities": ["Priority 1", ...] (5-7 immediate hiring needs),
  "hrWorkflows": ["Workflow 1", ...] (5-7 recommended HR workflows),
  "insights": "2-3 paragraph strategic HR insight for this company"
}

Return only valid JSON.`

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI did not return valid JSON')
  return JSON.parse(jsonMatch[0])
}

export async function generateEmailTemplate(params: {
  type: string
  candidateName: string
  jobTitle: string
  companyName: string
  additionalContext?: string
}): Promise<{ subject: string; body: string }> {
  const templates: Record<string, string> = {
    application_received: 'acknowledge receipt of application, confirm next steps',
    rejected: 'politely decline with encouragement for future applications',
    phone_interview: 'invite for a phone/video screening interview with scheduling instructions',
    interview_scheduled: 'confirm interview details, location/link, what to bring',
    offer: 'extend a job offer with key terms and instructions to accept',
    onboarding: 'welcome to the team, first day instructions and what to expect',
  }

  const prompt = `Write a professional, warm HR email for an East African company.

Type: ${params.type} - ${templates[params.type] || params.type}
Candidate: ${params.candidateName}
Position: ${params.jobTitle}
Company: ${params.companyName}
${params.additionalContext ? `Additional context: ${params.additionalContext}` : ''}

Return JSON:
{
  "subject": "Email subject line",
  "body": "Full email body with proper greeting and signature placeholder"
}

Keep it professional, warm, and appropriate for East African business culture. Return only valid JSON.`

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI did not return valid JSON')
  return JSON.parse(jsonMatch[0])
}

export async function generatePerformanceSummary(params: {
  employeeName: string
  jobTitle: string
  selfEvaluation: Record<string, unknown>
  supervisorEvaluation: Record<string, unknown>
  period: string
}): Promise<{ summary: string; recommendations: string; nextSteps: string }> {
  const prompt = `Summarize this performance review for an East African company HR record.

Employee: ${params.employeeName} - ${params.jobTitle}
Period: ${params.period}

Self-evaluation: ${JSON.stringify(params.selfEvaluation)}
Supervisor evaluation: ${JSON.stringify(params.supervisorEvaluation)}

Return JSON:
{
  "summary": "Balanced 2-3 paragraph summary of performance",
  "recommendations": "Specific development recommendations",
  "nextSteps": "Concrete next steps for the employee and manager"
}

Be constructive, specific, and professional. Decisions stay with HR/managers. Return only valid JSON.`

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI did not return valid JSON')
  return JSON.parse(jsonMatch[0])
}

export async function askHRAssistant(params: {
  question: string
  context: string
}): Promise<{ answer: string; suggestions?: string[] }> {
  const prompt = `You are TalentBridge AI, an HR assistant for East African companies. Answer this HR question using the provided context.

Context data:
${params.context}

Question: ${params.question}

Rules:
- Never make final hiring, firing, or promotion decisions
- Provide factual answers based on the data
- Suggest next steps for HR to take
- Be concise and practical

Return JSON:
{
  "answer": "Direct, helpful answer to the question",
  "suggestions": ["Action 1", "Action 2"] (optional follow-up actions for HR)
}`

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return { answer: text }
  return JSON.parse(jsonMatch[0])
}
