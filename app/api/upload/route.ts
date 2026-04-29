import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { v4 as uuid } from 'uuid'
import { extractTextFromFile } from '@/lib/resume-parser'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const type = formData.get('type') as string | null
  const candidateId = formData.get('candidateId') as string | null
  const employeeId = formData.get('employeeId') as string | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })

  const ext = path.extname(file.name)
  const fileName = `${uuid()}${ext}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads')

  await mkdir(uploadDir, { recursive: true })
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const filePath = path.join(uploadDir, fileName)
  await writeFile(filePath, buffer)

  const url = `/uploads/${fileName}`

  if (candidateId && (type === 'resume' || !type)) {
    const resumeText = await extractTextFromFile(filePath)
    await prisma.candidate.update({
      where: { id: candidateId },
      data: { resumeUrl: url, resumeText },
    })
  }

  if (employeeId && type) {
    await prisma.employeeDocument.create({
      data: {
        employeeId,
        name: file.name,
        type,
        url,
        uploadedBy: session.user.name,
      },
    })
  }

  return NextResponse.json({ url, fileName })
}
