import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'

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

  // 5. Test Gemini Models - HANGİSİ ÇALIŞIYOR?
  checks.geminiModels = {}
  
  if (process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const modelsToTest = [
      'gemini-1.5-pro',
      'gemini-1.5-pro-latest', 
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-pro'
    ]
    
    for (const modelName of modelsToTest) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent('Merhaba, test mesajı.')
        const text = result.response.text()
        checks.geminiModels[modelName] = { 
          status: 'OK', 
          response: text.substring(0, 50) + '...',
          length: text.length
        }
      } catch (e: any) {
        checks.geminiModels[modelName] = { 
          status: 'ERROR', 
          error: e.message || 'Unknown error'
        }
      }
    }
  }

  const allOk = checks.sessionOk && checks.geminiKeyPresent && checks.dbOk && checks.nextAuthSecretPresent

  return NextResponse.json({
    status: allOk ? 'OK' : 'ERROR',
    checks
  }, { status: allOk ? 200 : 500 })
}
