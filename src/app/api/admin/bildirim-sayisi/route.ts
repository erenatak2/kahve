import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  
  if (!token || token.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [orderCount, notificationCount] = await Promise.all([
      prisma.order.count({ where: { status: 'HAZIRLANIYOR' } }),
      prisma.paymentNotification.count({ where: { status: 'BEKLIYOR' } })
    ])
    
    return NextResponse.json({ orders: orderCount, notifications: notificationCount })
  } catch (error) {
    console.error('Bildirim sayisi hatasi:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
