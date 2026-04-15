import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const checks: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  }

  // 1. Session check
  try {
    const session = await getServerSession(authOptions)
    checks.session = session ? { user: session.user?.email, role: (session.user as any)?.role } : null
    checks.sessionOk = !!session
  } catch (e: any) {
    checks.sessionError = e.message
    checks.sessionOk = false
  }

  // 2. API Key check
  checks.geminiKeyPresent = !!process.env.GEMINI_API_KEY
  checks.geminiKeyPrefix = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 15) + '...' : null
  checks.geminiKeyLength = process.env.GEMINI_API_KEY?.length || 0

  // 3. Database check
  try {
    const orderCount = await prisma.order.count()
    checks.dbOrderCount = orderCount
    checks.dbOk = true
  } catch (e: any) {
    checks.dbError = e.message
    checks.dbOk = false
  }

  // 4. Auth secret check
  checks.nextAuthSecretPresent = !!process.env.NEXTAUTH_SECRET
  checks.nextAuthUrl = process.env.NEXTAUTH_URL

  const allOk = checks.sessionOk && checks.geminiKeyPresent && checks.dbOk && checks.nextAuthSecretPresent

  return NextResponse.json({
    status: allOk ? 'OK' : 'ERROR',
    checks
  }, { status: allOk ? 200 : 500 })
}
