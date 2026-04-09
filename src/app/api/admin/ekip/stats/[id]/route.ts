import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const memberId = params.id

  // Detaylı müşteri ve sipariş listesini bul
  const customers = await prisma.customer.findMany({
    where: { salesRepId: memberId, isActive: true },
    select: {
      id: true,
      user: { select: { name: true } },
      orders: {
        where: { status: { not: 'IPTAL' } },
        select: { totalAmount: true }
      }
    }
  })

  const customerDetails = customers.map(c => ({
    id: c.id,
    name: c.user.name,
    totalSales: c.orders.reduce((sum, o) => sum + o.totalAmount, 0),
    orderCount: c.orders.length
  })).sort((a, b) => b.totalSales - a.totalSales)

  const recentOrders = await prisma.order.findMany({
    where: {
      status: { not: 'IPTAL' },
      customer: { salesRepId: memberId }
    },
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { include: { user: { select: { name: true } } } },
      orderItems: { include: { product: { select: { name: true } } } }
    }
  })

  // Ürün bazlı satış toplamlarını hesapla
  const productStatsMap: any = {}
  const memberOrders = await prisma.order.findMany({
    where: {
      status: { not: 'IPTAL' },
      customer: { salesRepId: memberId }
    },
    include: {
      orderItems: { include: { product: { select: { name: true } } } }
    }
  })

  memberOrders.forEach(order => {
    order.orderItems.forEach(item => {
      const pName = item.product.name
      if (!productStatsMap[pName]) {
        productStatsMap[pName] = { name: pName, quantity: 0, total: 0 }
      }
      productStatsMap[pName].quantity += item.quantity
      productStatsMap[pName].total += item.total
    })
  })

  const productDetails = Object.values(productStatsMap).sort((a: any, b: any) => b.total - a.total)

  return NextResponse.json({
    customerDetails,
    recentOrders,
    productDetails
  })
}
