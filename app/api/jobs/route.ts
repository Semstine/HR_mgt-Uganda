import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/utils'
import { v4 as uuid } from 'uuid'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const jobs = await prisma.job.findMany({
    where: {
      companyId: session.user.companyId,
      ...(status ? { status: status as never } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      department: { select: { name: true } },
      _count: { select: { candidates: true } },
    },
  })

  return NextResponse.json({ jobs })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    title, departmentId, location, employmentType = 'FULL_TIME', description,
    responsibilities, requiredSkills = [], preferredSkills = [], experienceLevel,
    education, salaryMin, salaryMax, deadline, status = 'DRAFT',
    screeningKeywords = [], scoringCriteria, interviewQuestions = [], aiApproved = false,
  } = body

  if (!title) return NextResponse.json({ error: 'Job title is required' }, { status: 400 })

  const slug = `${slugify(title)}-${uuid().slice(0, 8)}`

  const j = (v: string[]) => JSON.stringify(v)
  const job = await prisma.job.create({
    data: {
      title,
      companyId: session.user.companyId,
      departmentId: departmentId || null,
      location,
      employmentType,
      description,
      responsibilities,
      requiredSkills: j(requiredSkills),
      preferredSkills: j(preferredSkills),
      experienceLevel,
      education,
      salaryMin,
      salaryMax,
      deadline: deadline ? new Date(deadline) : null,
      status,
      screeningKeywords: j(screeningKeywords),
      scoringCriteria: scoringCriteria ? JSON.stringify(scoringCriteria) : null,
      interviewQuestions: j(interviewQuestions),
      aiApproved,
      publicSlug: slug,
    },
  })

  return NextResponse.json({ job }, { status: 201 })
}
