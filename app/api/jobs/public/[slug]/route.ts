import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const job = await prisma.job.findUnique({
    where: { publicSlug: params.slug },
    include: { company: { select: { name: true } } },
  })

  if (!job || job.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Job not found or closed' }, { status: 404 })
  }

  return NextResponse.json({ job })
}
