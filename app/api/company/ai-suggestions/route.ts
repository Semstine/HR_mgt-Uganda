import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { generateCompanySuggestions } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const suggestions = await generateCompanySuggestions(body)
    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
  }
}
