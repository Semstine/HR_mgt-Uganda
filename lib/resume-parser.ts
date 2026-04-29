import mammoth from 'mammoth'

export interface ParsedResume {
  name?: string
  email?: string
  phone?: string
  location?: string
  education?: string
  experience?: string
  skills: string[]
  jobTitles: string[]
  employers: string[]
  certifications: string[]
  yearsOfExperience?: number
  rawText: string
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  // DOCX
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  // PDF — use pdf-parse when available, fall back to text scan
  if (mimeType === 'application/pdf') {
    try {
      // Dynamic import to avoid module resolution errors in edge runtimes
      const pdfParse = (await import('pdf-parse')).default
      const data = await pdfParse(buffer)
      return data.text || ''
    } catch {
      // Fallback: naive binary text extraction
      const raw = buffer.toString('latin1')
      const readable = raw
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
        .replace(/\s{3,}/g, '\n')
        .trim()
      return readable.length > 80 ? readable : '[PDF text could not be extracted]'
    }
  }

  // Plain text
  if (mimeType === 'text/plain') {
    return buffer.toString('utf-8')
  }

  return '[Unsupported file format]'
}

// ─── Field extractors ─────────────────────────────────────────────────────────

function extractEmail(text: string): string | undefined {
  return text.match(/[\w.+\-]+@[\w\-]+\.[a-zA-Z]{2,}/)?.[0]
}

function extractPhone(text: string): string | undefined {
  const match = text.match(/(\+?\d[\d\s\-().]{8,17}\d)/)
  return match?.[0]?.replace(/\s+/g, ' ').trim()
}

function extractName(lines: string[]): string | undefined {
  for (const line of lines.slice(0, 5)) {
    const clean = line.trim().replace(/\b(resume|cv|curriculum vitae)\b/gi, '').trim()
    // Looks like a name: 2-4 capitalised words, no special chars
    if (/^[A-Z][a-z]+(\s[A-Z][a-z]+){1,3}$/.test(clean)) return clean
  }
  return undefined
}

function extractLocation(text: string): string | undefined {
  const ea = [
    'kampala', 'nairobi', 'dar es salaam', 'kigali', 'entebbe', 'mombasa',
    'jinja', 'gulu', 'mbarara', 'arusha', 'dodoma', 'kisumu',
    'uganda', 'kenya', 'tanzania', 'rwanda', 'ethiopia', 'south sudan',
  ]
  const lines = text.split('\n')
  for (const line of lines) {
    if (ea.some((kw) => line.toLowerCase().includes(kw))) return line.trim()
  }
  return undefined
}

function extractSkills(text: string): string[] {
  const skillSection = text.match(/skills?[:\s\n]+([\s\S]{0,600}?)(\n{2,}|experience|education|work|certif)/i)?.[1] || ''
  const techTerms = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'React', 'Node.js', 'Next.js',
    'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Excel', 'QuickBooks', 'Tally',
    'AWS', 'Docker', 'Git', 'Linux', 'HTML', 'CSS', 'PHP', 'Laravel',
    'PAYE', 'NSSF', 'URA', 'Accounting', 'Finance', 'Marketing', 'Sales',
    'Project Management', 'Communication', 'Leadership', 'Data Analysis',
    'Microsoft Office', 'Photoshop', 'Figma',
  ]
  const found = new Set<string>()
  const combined = (skillSection + ' ' + text).toLowerCase()
  for (const skill of techTerms) {
    if (combined.includes(skill.toLowerCase())) found.add(skill)
  }
  // Also grab bullet-separated tokens from the skills section
  const bullets = skillSection.split(/[,•\-\n|/]/).map((s) => s.trim()).filter((s) => s.length > 2 && s.length < 40)
  for (const b of bullets) found.add(b)
  return [...found].slice(0, 20)
}

function extractJobTitles(text: string): string[] {
  const titles: string[] = []
  const patterns = [
    /(?:position|title|role)[:\s]+([^\n,]{3,50})/gi,
    /(?:worked as|serving as|currently)[:\s]+([^\n,]{3,50})/gi,
  ]
  for (const p of patterns) {
    let m
    while ((m = p.exec(text)) !== null) titles.push(m[1].trim())
  }
  // Common title keywords
  const keywords = ['engineer', 'manager', 'officer', 'director', 'analyst', 'developer', 'accountant', 'consultant', 'coordinator', 'assistant', 'specialist']
  const lines = text.split('\n')
  for (const line of lines) {
    const l = line.trim()
    if (l.length > 3 && l.length < 60 && keywords.some((kw) => l.toLowerCase().includes(kw))) {
      titles.push(l)
    }
  }
  return [...new Set(titles)].slice(0, 6)
}

function extractEmployers(text: string): string[] {
  const employers: string[] = []
  const patterns = [
    /(?:company|employer|organization|organisation)[:\s]+([^\n,]{3,60})/gi,
    /(?:at|@)\s+([A-Z][^\n,]{3,50}(?:Ltd|Limited|Inc|Uganda|Kenya|Africa|Group)?)/g,
  ]
  for (const p of patterns) {
    let m
    while ((m = p.exec(text)) !== null) employers.push(m[1].trim())
  }
  return [...new Set(employers)].slice(0, 6)
}

function extractCertifications(text: string): string[] {
  const certs: string[] = []
  const certSection = text.match(/certif[^\n]{0,20}\n([\s\S]{0,400}?)(\n{2,}|education|skills|experience)/i)?.[1] || ''
  const lines = (certSection + '\n' + text).split('\n')
  for (const line of lines) {
    const l = line.trim()
    if (/\b(certif|diploma|certificate|cpa|acca|cima|pmp|aws|google|microsoft|cisco|oracle)\b/i.test(l) && l.length < 120) {
      certs.push(l)
    }
  }
  return [...new Set(certs)].slice(0, 8)
}

function extractEducation(text: string): string | undefined {
  const section = text.match(/education[:\n]([\s\S]{0,500}?)(\n{2,}|experience|skills|certif)/i)?.[1]
  if (section) return section.trim().slice(0, 300)
  const degrees = text.match(/\b(bachelor|master|phd|diploma|degree|bsc|msc|mba|bcom|bacom)[^\n]{0,80}/i)
  return degrees?.[0]?.trim()
}

function extractYearsExperience(text: string): number | undefined {
  const match = text.match(/(\d+)\+?\s*years?\s*(?:of\s*)?(?:experience|exp)/i)
  if (match) return parseInt(match[1])
  // Count year ranges like 2018 - 2023
  const yearRanges = [...text.matchAll(/20\d{2}\s*[-–]\s*(20\d{2}|present|current)/gi)]
  if (yearRanges.length > 0) {
    const currentYear = new Date().getFullYear()
    let totalYears = 0
    for (const m of yearRanges) {
      const from = parseInt(m[0])
      const toStr = m[1].toLowerCase()
      const to = /present|current/.test(toStr) ? currentYear : parseInt(toStr)
      if (!isNaN(from) && !isNaN(to)) totalYears += Math.max(0, to - from)
    }
    return totalYears > 0 ? Math.min(totalYears, 40) : undefined
  }
  return undefined
}

function extractExperience(text: string): string | undefined {
  const section = text.match(/(?:work\s*)?experience[:\n]([\s\S]{0,600}?)(\n{2,}education|\n{2,}skills|\n{2,}certif)/i)?.[1]
  return section?.trim().slice(0, 500)
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function parseResumeText(rawText: string): ParsedResume {
  const lines = rawText.split('\n').filter((l) => l.trim().length > 0)
  return {
    name: extractName(lines),
    email: extractEmail(rawText),
    phone: extractPhone(rawText),
    location: extractLocation(rawText),
    education: extractEducation(rawText),
    experience: extractExperience(rawText),
    skills: extractSkills(rawText),
    jobTitles: extractJobTitles(rawText),
    employers: extractEmployers(rawText),
    certifications: extractCertifications(rawText),
    yearsOfExperience: extractYearsExperience(rawText),
    rawText,
  }
}

// Legacy path-based helper (kept for compatibility)
export async function extractTextFromFile(filePath: string): Promise<string> {
  const fs = await import('fs/promises')
  const path = await import('path')
  const buffer = await fs.readFile(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const mimeMap: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.txt': 'text/plain',
  }
  return extractTextFromBuffer(buffer, mimeMap[ext] || 'text/plain')
}

export function parseContactInfo(text: string) {
  return {
    email: extractEmail(text),
    phone: extractPhone(text),
    name: extractName(text.split('\n').filter(Boolean)),
    location: extractLocation(text),
  }
}
