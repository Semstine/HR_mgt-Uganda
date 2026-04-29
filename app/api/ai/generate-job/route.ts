import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateJobDescription } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const company = await prisma.company.findUnique({ where: { id: session.user.companyId }, select: { industry: true } })
  const body = await req.json()

  try {
    const result = await generateJobDescription({
      ...body,
      industry: company?.industry || body.industry || 'General',
    })
    return NextResponse.json({ result })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
  }
}
