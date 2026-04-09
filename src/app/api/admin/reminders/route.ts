import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const role = (session.user as any).role
  const userId = (session.user as any).id

  const reminders = await prisma.order.findMany({
    where: {
      reminderAt: { not: null },
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
            select: { name: true }
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
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const { orderId, followupStatus } = await req.json()

  const order = await prisma.order.update({
    where: { id: orderId },
    data: { followupStatus }
  })

  return NextResponse.json(order)
}
