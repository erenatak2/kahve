import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AdminDashboardClient from './AdminDashboardClient'
import { redirect } from 'next/navigation'

async function getDashboardData(session: any) {
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
    take: 4
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

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
    take: 5
  })

  // "Bugün Aranacaklar" — gecikmiş + bugün planlanmış
  const todayCalls = await prisma.customer.findMany({
    where: {
      nextCallDate: { lte: todayEnd },
      followUpStatus: 'BEKLIYOR',
      ...(isSalesRep ? { salesRepId: userId } : {})
    },
    include: {
      user: { select: { name: true } }
    },
    orderBy: { nextCallDate: 'asc' },
    take: 10
  })

  // Sipariş bazlı bugünkü hatırlatıcılar
  const todayOrderReminders = await prisma.order.findMany({
    where: {
      reminderAt: { lte: todayEnd },
      followupStatus: 'BEKLIYOR',
      ...(isSalesRep ? { customer: { salesRepId: userId } } : {})
    },
    include: {
      customer: { include: { user: { select: { name: true } } } }
    },
    orderBy: { reminderAt: 'asc' },
    take: 10
  })

  // 10. Akıllı Analiz ve Segmentasyon (Risk Yönetimi)
  const allCustomersWithOrders = await prisma.customer.findMany({
    where: {
      isActive: true,
      ...(isSalesRep ? { salesRepId: userId } : {})
    },
    include: {
      user: { select: { name: true } },
      orders: {
        where: { status: { not: 'IPTAL' } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, totalAmount: true }
      }
    }
  })

  const nowTime = new Date().getTime()
  
  const segments = {
    vip: [] as any[],
    regular: [] as any[],
    atRisk: [] as any[],
    passive: [] as any[]
  }

  allCustomersWithOrders.forEach(c => {
    const orders = c.orders
    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0)
    
    let avgDays = c.avgOrderDays || 30 // Varsayılan 30 gün
    
    // Eğer 2 veya daha fazla siparişi varsa ortalama süreyi hesapla
    if (orders.length >= 2) {
      const firstOrder = new Date(orders[orders.length - 1].createdAt).getTime()
      const lastOrder = new Date(orders[0].createdAt).getTime()
      const totalDays = (lastOrder - firstOrder) / (1000 * 60 * 60 * 24)
      avgDays = totalDays / (orders.length - 1)
      if (avgDays < 1) avgDays = 1 // Güvenlik sınırı
    }

    const lastOrderDate = orders.length > 0 ? new Date(orders[0].createdAt).getTime() : 0
    const daysSinceLastOrder = lastOrderDate > 0 ? (nowTime - lastOrderDate) / (1000 * 60 * 60 * 24) : 999
    
    const customerData = {
      id: c.id,
      name: c.businessName || c.user?.name || '',
      phone: c.phone || '',
      avgDays: Math.round(avgDays),
      daysSinceLastOrder: Math.round(daysSinceLastOrder),
      totalRevenue,
      orderCount: orders.length
    }

    if (orders.length === 0) {
      segments.passive.push(customerData)
    } else if (daysSinceLastOrder > avgDays * 2) {
      segments.passive.push(customerData)
    } else if (daysSinceLastOrder > avgDays * 1.25) {
      segments.atRisk.push(customerData)
    } else if (totalRevenue > 50000 || (orders.length > 10 && daysSinceLastOrder < avgDays)) {
      segments.vip.push(customerData)
    } else {
      segments.regular.push(customerData)
    }
  })

  // Mevcut bölgeleri getir (Filtre için)
  const regions = await prisma.customer.findMany({
    where: { region: { not: null } },
    select: { region: true },
    distinct: ['region']
  })

  return {
    stats: {
      totalOrders,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      totalCustomers,
      totalProducts
    },
    recentOrders,
    pendingPayments,
    reminders,
    segments,
    regions: regions.map(r => r.region).filter(Boolean),
    todayCalls: [
      ...todayCalls.map(c => ({
        id: c.id,
        type: 'CUSTOMER' as const,
        name: c.businessName || c.user?.name || '',
        phone: c.phone || '',
        date: c.nextCallDate,
        region: c.region
      })),
      ...todayOrderReminders.map(o => ({
        id: o.id,
        type: 'ORDER' as const,
        name: o.customer?.businessName || o.customer?.user?.name || '',
        phone: o.customer?.phone || '',
        date: o.reminderAt,
        note: o.reminderNote,
        region: o.customer?.region
      }))
    ]
  }
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions)

  if (!session || !['ADMIN', 'SATICI'].includes((session?.user as any)?.role)) {
    redirect('/auth/login')
  }

  const dashboardData = await getDashboardData(session)

  return <AdminDashboardClient initialData={dashboardData} session={session} />
}
