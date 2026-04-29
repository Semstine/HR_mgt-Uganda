import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      department: { select: { name: true } },
      candidates: {
        orderBy: [{ screeningScore: 'desc' }, { applicationDate: 'desc' }],
        select: {
          id: true, firstName: true, lastName: true, email: true,
          status: true, screeningScore: true, applicationDate: true,
        },
      },
    },
  })

  if (!job || job.companyId !== session.user.companyId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ job })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const job = await prisma.job.update({
    where: { id: params.id },
    data: body,
  })

  return NextResponse.json({ job })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.job.update({ where: { id: params.id }, data: { status: 'CLOSED' } })
  return NextResponse.json({ success: true })
}
