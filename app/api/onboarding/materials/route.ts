import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const status = searchParams.get('status') ?? 'active'

  const materials = await prisma.onboardingMaterial.findMany({
    where: {
      companyId: session.user.companyId,
      ...(category ? { category } : {}),
      ...(status !== 'all' ? { status } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ materials })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const allowed = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER']
  if (!allowed.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { title, description, category, fileUrl, fileType, storageKey, version, status, appliesTo, appliesValue, isRequired } = body

  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

  const material = await prisma.onboardingMaterial.create({
    data: {
      companyId: session.user.companyId,
      title,
      description,
      category: category ?? 'general',
      fileUrl,
      fileType,
      storageKey,
      version: version ?? '1.0',
      status: status ?? 'active',
      appliesTo: appliesTo ?? 'all',
      appliesValue,
      uploadedBy: session.user.name || session.user.email,
      isRequired: isRequired ?? false,
    },
  })

  return NextResponse.json({ material }, { status: 201 })
}
