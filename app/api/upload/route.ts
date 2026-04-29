import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadFile, getSignedDownloadUrl } from '@/lib/storage'
import { extractTextFromBuffer, parseResumeText } from '@/lib/resume-parser'

const MAX_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'image/jpeg',
  'image/png',
]

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const type = (formData.get('type') as string) || 'document'
  const candidateId = formData.get('candidateId') as string | null
  const employeeId = formData.get('employeeId') as string | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const folder = candidateId ? 'candidates' : employeeId ? 'employees' : 'company'
  const result = await uploadFile(buffer, file.name, folder)

  const { url: signedUrl } = await getSignedDownloadUrl(result.storageKey)

  // Log upload in FileUpload table
  const entityId = candidateId || employeeId || session.user.companyId!
  const entityType = candidateId ? 'candidate' : employeeId ? 'employee' : 'company'

  await prisma.fileUpload.create({
    data: {
      companyId: session.user.companyId,
      entityType,
      entityId,
      name: file.name,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      storageKey: result.storageKey,
      storageUrl: signedUrl,
      provider: result.provider,
      bucket: result.bucket,
      uploadedBy: session.user.id,
      isPrivate: true,
    },
  })

  // If resume upload, extract and parse text then update candidate
  if (candidateId && (type === 'resume' || !type)) {
    const rawText = await extractTextFromBuffer(buffer, file.type)
    const parsed = parseResumeText(rawText)

    await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        resumeUrl: signedUrl,
        resumeText: rawText,
        resumeParsed: parsed as never,
        parsedName: parsed.name,
        parsedEmail: parsed.email,
        parsedPhone: parsed.phone,
        parsedLocation: parsed.location,
        parsedEducation: parsed.education,
        parsedExperience: parsed.experience,
        parsedSkills: parsed.skills,
        parsedJobTitles: parsed.jobTitles,
        parsedEmployers: parsed.employers,
        certifications: parsed.certifications,
        parsedYearsExp: parsed.yearsOfExperience,
      },
    })

    return NextResponse.json({
      storageKey: result.storageKey,
      url: signedUrl,
      parsed,
    })
  }

  // Employee document
  if (employeeId) {
    await prisma.employeeDocument.create({
      data: {
        employeeId,
        name: file.name,
        type,
        url: signedUrl,
        storageKey: result.storageKey,
        uploadedBy: session.user.name,
      },
    })
  }

  return NextResponse.json({ storageKey: result.storageKey, url: signedUrl })
}
