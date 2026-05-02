import { NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { requireAuth, canManageVacancies } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(req.url)
    const departmentId = searchParams.get('departmentId')
    const districtId = searchParams.get('districtId') || session.user.districtId

    const structure = await withRetry(() =>
      prisma.approvedStaffStructure.findMany({
        where: {
          ...(departmentId ? { departmentId } : {}),
          ...(districtId ? { districtId } : {}),
        },
        include: {
          district: true,
          department: true,
          salaryScale: true,
        },
        orderBy: [{ postTitle: 'asc' }],
      })
    )
    return NextResponse.json({ data: structure })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth()
    if (!canManageVacancies(session.user.role as any)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await req.json()
    const post = await withRetry(() =>
      prisma.approvedStaffStructure.create({
        data: {
          districtId: body.districtId || session.user.districtId!,
          departmentId: body.departmentId,
          salaryScaleId: body.salaryScaleId,
          postTitle: body.postTitle,
          postCode: body.postCode || body.postTitle.slice(0, 6).toUpperCase().replace(/\s/g, ''),
          grade: body.grade,
          approvedPosts: body.approvedPosts,
          filledPosts: body.filledPosts ?? 0,
          vacantPosts: body.vacantPosts ?? body.approvedPosts,
          financialYear: body.financialYear || String(new Date().getFullYear()),
          minimumQualification: body.minimumQualification,
          experienceRequired: body.experienceRequired,
          jobDescription: body.jobDescription,
        },
        include: { salaryScale: true },
      })
    )
    return NextResponse.json({ data: post }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
