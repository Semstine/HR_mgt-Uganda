import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { screenResume } from '@/lib/ai'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const candidate = await prisma.candidate.findUnique({
    where: { id: params.id },
    include: { job: true },
  })

  if (!candidate || candidate.job.companyId !== session.user.companyId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const resumeText = candidate.resumeText || '[No resume text available — candidate uploaded a file]'

  try {
    const result = await screenResume({
      resumeText,
      jobTitle: candidate.job.title,
      requiredSkills: candidate.job.requiredSkills,
      preferredSkills: candidate.job.preferredSkills,
      experienceLevel: candidate.job.experienceLevel || undefined,
      education: candidate.job.education || undefined,
      screeningKeywords: candidate.job.screeningKeywords,
    })

    const updated = await prisma.candidate.update({
      where: { id: params.id },
      data: {
        screeningScore: result.score,
        screeningNotes: result.explanation,
        screeningData: result as never,
        status: candidate.status === 'RECEIVED' ? 'UNDER_REVIEW' : candidate.status,
      },
    })

    if (candidate.status === 'RECEIVED') {
      await prisma.candidateStatusHistory.create({
        data: {
          candidateId: params.id,
          fromStatus: 'RECEIVED',
          toStatus: 'UNDER_REVIEW',
          reason: 'AI screening completed',
          changedBy: 'AI System',
        },
      })
    }

    return NextResponse.json({ candidate: updated, screening: result })
  } catch (error) {
    console.error('Screening error:', error)
    return NextResponse.json({ error: 'Screening failed' }, { status: 500 })
  }
}
