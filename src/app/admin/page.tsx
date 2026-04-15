import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AdminDashboardClient from './AdminDashboardClient'
import { redirect } from 'next/navigation'

async function getDashboardData(session: any) {
  const userId = (session.user as any).id
  const role = (session.user as any).role
  const isSalesRep = role === 'SATICI'

  // Tüm bağımsız sorguları tek bir dev paralel havuzda topla (Turbo Query)
  const [
    statsData,
    recentOrders,
    pendingPayments,
    reminders,
    todayCalls,
    todayOrderReminders,
    allCustomersWithOrders,
    regions
  ] = await Promise.all([
    // 1. Genel İstatistikler
    Promise.all([
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
    ]),

    // 2. Son Siparişler (Sadece ilk 10)
    prisma.order.findMany({
      where: {
        ...(isSalesRep ? { customer: { salesRepId: userId } } : {})
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { include: { user: { select: { name: true } } } }
      }
    }),

    // 3. Bekleyen Ödemeler / Alacaklar (Payment tablosundan)
    prisma.payment.findMany({
      where: {
        status: { in: ['BEKLIYOR', 'GECIKTI'] },
        ...(isSalesRep ? { order: { customer: { salesRepId: userId } } } : {})
      },
      include: {
        order: { select: { customer: { select: { user: { select: { name: true } } } } } }
      },
      orderBy: { dueDate: 'asc' },
      take: 4
    }),

    // 4. Gelecek Hatırlatıcılar
    prisma.order.findMany({
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
    }),

    // 5. Bugun Aranacaklar
    prisma.customer.findMany({
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
    }),

    // 6. Bugünkü Sipariş Hatırlatıcıları
    prisma.order.findMany({
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
    }),

    // 7. Akıllı Analiz ve Segmentasyon (Risk Yönetimi)
    prisma.customer.findMany({
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
    }),

    // 8. Bölgeler
    prisma.customer.findMany({
      where: { region: { not: null } },
      select: { region: true },
      distinct: ['region']
    })
  ])

  const [totalOrders, totalRevenue, totalCustomers, totalProducts] = statsData

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
