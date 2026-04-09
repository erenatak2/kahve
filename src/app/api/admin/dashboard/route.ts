import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'SATICI'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const userId = (session.user as any).id
  const role = (session.user as any).role
  const isSalesRep = role === 'SATICI'

  // 1. Genel İstatistikler
  const [totalOrders, totalRevenue, totalCustomers, totalProducts] = await Promise.all([
    prisma.order.count({
      where: {
        status: { not: 'IPTAL' },
        ...(isSalesRep ? { customer: { salesRepId: userId } } : {})
      }
    }),
    prisma.order.aggregate({
      where: {
        status: { not: 'IPTAL' },
        ...(isSalesRep ? { customer: { salesRepId: userId } } : {})
      },
      _sum: { totalAmount: true }
    }),
    prisma.customer.count({
      where: {
        isActive: true,
        ...(isSalesRep ? { salesRepId: userId } : {})
      }
    }),
    prisma.product.count({ where: { isDeleted: false } })
  ])

  // 2. Son Siparişler (Sadece ilk 10)
  const recentOrders = await prisma.order.findMany({
    where: {
      ...(isSalesRep ? { customer: { salesRepId: userId } } : {})
    },
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { include: { user: { select: { name: true } } } }
    }
  })

  // 3. Bekleyen Ödemeler / Alacaklar (Nokta atışı sorgu)
  const pendingPayments = await prisma.collection.findMany({
    where: {
      status: { in: ['BEKLIYOR', 'GECIKTI'] },
      ...(isSalesRep ? { order: { customer: { salesRepId: userId } } } : {})
    },
    include: {
      order: { select: { customer: { select: { user: { select: { name: true } } } } } }
    },
    orderBy: { dueDate: 'asc' },
    take: 20
  })

  // 4. Hatırlatıcılar (Bugün ve gelecek)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const reminders = await prisma.order.findMany({
    where: {
      reminderAt: { gte: today },
      ...(isSalesRep ? { customer: { salesRepId: userId } } : {})
    },
    select: {
      id: true,
      reminderAt: true,
      reminderNote: true,
      customer: { select: { user: { select: { name: true } } } }
    },
    orderBy: { reminderAt: 'asc' },
    take: 10
  })

  return NextResponse.json({
    stats: {
      totalOrders,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      totalCustomers,
      totalProducts
    },
    recentOrders,
    pendingPayments,
    reminders
  })
}
