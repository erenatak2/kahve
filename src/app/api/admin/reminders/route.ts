import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const role = (session.user as any).role
  const userId = (session.user as any).id
  const now = new Date()

  const reminders = await prisma.order.findMany({
    where: {
      reminderAt: { 
        not: null,
        lte: now 
      },
      followupStatus: 'BEKLIYOR',
      ...(role === 'SATICI' && {
        customer: {
          salesRepId: userId
        }
      })
    },
    include: {
      customer: {
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      }
    },
    orderBy: {
      reminderAt: 'asc'
    }
  })

  return NextResponse.json(reminders)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const url = new URL(req.url)
  const idFromQuery = url.searchParams.get('id')
  
  const body = await req.json().catch(() => ({}))
  const orderId = idFromQuery || body.id || body.orderId
  const status = body.status || 'ARANDI'

  if (!orderId) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })

  const order = await prisma.order.update({
    where: { id: orderId },
    data: { followupStatus: status }
  })

  return NextResponse.json(order)
}
