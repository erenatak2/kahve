import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'genel'
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

  if (type === 'aylik') {
    const monthlyData = []
    for (let month = 1; month <= 12; month++) {
      const start = new Date(year, month - 1, 1)
      const end = new Date(year, month, 0, 23, 59, 59)
      const orders = await prisma.order.findMany({
        where: { status: { not: 'IPTAL' } },
        include: { payments: true },
      })
      // orderDate veya createdAt'e göre filtrele
      const filteredOrders = orders.filter((o: any) => {
        const orderDate = new Date(o.orderDate || o.createdAt)
        return orderDate >= start && orderDate <= end
      })
      const totalSales = filteredOrders.reduce((sum: number, o: { totalAmount: number }) => sum + o.totalAmount, 0)
      const totalPayments = filteredOrders.reduce((sum: number, o: { payments: { status: string; amount: number }[] }) => sum + o.payments.filter((p: { status: string }) => p.status === 'ODENDI').reduce((s: number, p: { amount: number }) => s + p.amount, 0), 0)
      monthlyData.push({ month, totalSales, totalPayments, orderCount: filteredOrders.length })
    }
    return NextResponse.json(monthlyData)
  }

  if (type === 'urun') {
    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31, 23, 59, 59)
    const orderItems = await prisma.orderItem.findMany({
      include: { product: true, order: true },
      where: { order: { status: { not: 'IPTAL' } } },
    })
    // orderDate veya createdAt'e göre filtrele
    const filteredItems = orderItems.filter((item: any) => {
      const orderDate = new Date(item.order.orderDate || item.order.createdAt)
      return orderDate >= yearStart && orderDate <= yearEnd
    })
    const productMap: Record<string, any> = {}
    for (const item of filteredItems) {
      if (item.order.status === 'IPTAL') continue
      if (!productMap[item.productId]) {
        productMap[item.productId] = { product: item.product, totalQuantity: 0, totalRevenue: 0 }
      }
      productMap[item.productId].totalQuantity += item.quantity
      productMap[item.productId].totalRevenue += item.total
    }
    const sorted = Object.values(productMap).sort((a: { totalRevenue: number }, b: { totalRevenue: number }) => b.totalRevenue - a.totalRevenue)
    return NextResponse.json(sorted)
  }

  if (type === 'musteri') {
    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31, 23, 59, 59)
    const customers = await prisma.customer.findMany({
      include: {
        user: { select: { name: true } },
        orders: { where: { status: { not: 'IPTAL' } }, include: { payments: true } },
      },
    })
    // orderDate veya createdAt'e göre filtrele
    const data = customers.map((c: typeof customers[number]) => {
      const filteredOrders = c.orders.filter((o: any) => {
        const orderDate = new Date(o.orderDate || o.createdAt)
        return orderDate >= yearStart && orderDate <= yearEnd
      })
      return {
        customerId: c.id,
        name: c.user.name,
        totalOrders: filteredOrders.length,
        totalRevenue: filteredOrders.reduce((sum: number, o: { totalAmount: number }) => sum + o.totalAmount, 0),
        totalPaid: filteredOrders.reduce((sum: number, o: { payments: { status: string; amount: number }[] }) => sum + o.payments.filter((p: { status: string }) => p.status === 'ODENDI').reduce((s: number, p: { amount: number }) => s + p.amount, 0), 0),
      }
    }).filter((d: any) => d.totalOrders > 0).sort((a: { totalRevenue: number }, b: { totalRevenue: number }) => b.totalRevenue - a.totalRevenue)
    return NextResponse.json(data)
  }

  const [totalOrders, totalRevenue, totalCustomers, totalProducts, recentOrders] = await Promise.all([
    prisma.order.count({ where: { status: { not: 'IPTAL' } } }),
    prisma.order.aggregate({ where: { status: { not: 'IPTAL' } }, _sum: { totalAmount: true } }),
    prisma.customer.count({ where: { isActive: true } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { customer: { include: { user: { select: { name: true } } } } },
    }),
  ])

  return NextResponse.json({
    totalOrders,
    totalRevenue: totalRevenue._sum.totalAmount || 0,
    totalCustomers,
    totalProducts,
    recentOrders,
  })
}
