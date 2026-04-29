import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { companyName, industry, size, location, adminName, adminEmail, password } = await req.json()

    if (!companyName || !adminEmail || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email: adminEmail.toLowerCase() } })
    if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 409 })

    const company = await prisma.company.create({
      data: {
        name: companyName,
        industry,
        size,
        location,
        settings: {
          create: { country: 'Uganda', currency: 'UGX' },
        },
      },
    })

    const hashed = await bcrypt.hash(password, 12)
    await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail.toLowerCase(),
        password: hashed,
        role: 'COMPANY_ADMIN',
        companyId: company.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
