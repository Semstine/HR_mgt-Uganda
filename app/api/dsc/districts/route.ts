import { NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    await requireAuth()
    const districts = await withRetry(() =>
      prisma.district.findMany({
        include: {
          dsc: true,
          _count: { select: { departments: true, users: true } },
        },
        orderBy: { name: 'asc' },
      })
    )
    return NextResponse.json({ data: districts })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth()
    if (!['SUPER_ADMIN', 'NATIONAL_ADMIN_MOPS'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await req.json()
    const district = await withRetry(() =>
      prisma.district.create({
        data: {
          name: body.name,
          region: body.region,
          code: body.code,
          districtType: body.districtType || 'district',
          headquarters: body.headquarters || body.name,
        },
      })
    )
    return NextResponse.json({ data: district }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
