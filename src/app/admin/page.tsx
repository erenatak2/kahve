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

  // 4. Hatırlatıcılar
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
    take: 5
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
    reminders
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
