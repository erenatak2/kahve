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
    prisma.product.count({ where: { isActive: true } })
  ])

  // 2. Son Siparişler
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

  // 3. Bekleyen Ödemeler / Alacaklar (Payment tablosundan)
  const pendingPayments = await prisma.payment.findMany({
    where: {
      status: { in: ['BEKLIYOR', 'GECIKTI'] },
      ...(isSalesRep ? { order: { customer: { salesRepId: userId } } } : {})
    },
    include: {
      order: { select: { customer: { select: { user: { select: { name: true } } } } } }
    },
    orderBy: { dueDate: 'asc' },
    take: 10
  })

  // 4. Hatırlatıcılar
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Tarihleri UTC'ye çevir (veritabanı ile uyumlu olması için)
  const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
  const tomorrowUTC = new Date(Date.UTC(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate()))

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

  // 5. Bugün Aranacaklar (todayCalls) - sadece gün kontrolü, saat beklenmez
  const todayCalls = await prisma.customer.findMany({
    where: {
      nextCallDate: {
        gte: todayUTC,
        lt: tomorrowUTC
      },
      isActive: true,
      ...(isSalesRep ? { salesRepId: userId } : {})
    },
    select: {
      id: true,
      user: { select: { name: true } },
      phone: true,
      region: true,
      nextCallDate: true
    },
    orderBy: { nextCallDate: 'asc' }
  })

  // Kontaklardaki hatırlatıcılar - sadece gün kontrolü
  const contactReminders = await prisma.contact.findMany({
    where: {
      reminderAt: {
        gte: todayUTC,
        lt: tomorrowUTC
      }
    },
    select: {
      id: true,
      name: true,
      phone: true,
      reminderAt: true,
      notes: true
    },
    orderBy: { reminderAt: 'asc' }
  })

  // Sipariş hatırlatıcılarını da todayCalls'a ekle - sadece gün kontrolü
  const orderReminders = await prisma.order.findMany({
    where: {
      reminderAt: {
        gte: todayUTC,
        lt: tomorrowUTC
      },
      status: 'TESLIM_EDILDI',
      ...(isSalesRep ? { customer: { salesRepId: userId } } : {})
    },
    include: {
      customer: {
        select: {
          id: true,
          user: { select: { name: true } },
          phone: true,
          region: true
        }
      }
    },
    orderBy: { reminderAt: 'asc' }
  })

  // Sipariş hatırlatıcılarını todayCalls formatına dönüştür
  const orderCalls = orderReminders.map(o => ({
    id: o.id,
    name: o.customer.user.name,
    phone: o.customer.phone,
    region: o.customer.region,
    date: o.reminderAt,
    type: 'ORDER' as const,
    customerId: o.customer.id
  }))

  // Kontak hatırlatıcılarını todayCalls formatına dönüştür
  const contactCalls = contactReminders.map(c => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    region: null,
    date: c.reminderAt,
    type: 'CONTACT' as const,
    customerId: null
  }))

  // Müşteri aramalarını da todayCalls formatına dönüştür
  const customerCalls = todayCalls.map(c => ({
    id: c.id,
    name: c.user.name,
    phone: c.phone,
    region: c.region,
    date: c.nextCallDate,
    type: 'CUSTOMER' as const,
    customerId: c.id
  }))

  // Birleştir
  const allTodayCalls = [...customerCalls, ...orderCalls, ...contactCalls].sort((a, b) =>
    new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()
  )

  return NextResponse.json({
    stats: {
      totalOrders,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      totalCustomers,
      totalProducts
    },
    recentOrders,
    pendingPayments,
    reminders,
    todayCalls: allTodayCalls
  })
}
