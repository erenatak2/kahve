import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const notifications = await prisma.paymentNotification.findMany({
    include: {
      order: {
        include: {
          customer: {
            include: {
              user: { select: { name: true, email: true } }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(notifications)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const { id, status, adminNotes } = await req.json()

  if (!id || !status) {
    return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 })
  }

  const notification = await prisma.paymentNotification.update({
    where: { id },
    data: { status, adminNotes },
    include: {
      order: true
    }
  })

  // Onaylanırsa tahsilatı da ödendi olarak işaretle
  if (status === 'ONAYLANDI') {
    await prisma.payment.updateMany({
      where: { 
        orderId: notification.orderId,
        status: 'BEKLIYOR'
      },
      data: { 
        status: 'ODENDI',
        paidAt: new Date()
      }
    })
  }

  return NextResponse.json(notification)
}
